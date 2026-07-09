import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email/email.service';

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {
    this.refreshSecret = process.env.REFRESH_SECRET ||
      (process.env.NODE_ENV === 'production'
        ? (() => { throw new Error('REFRESH_SECRET é obrigatório em produção'); })()
        : 'dev-refresh-secret');
  }

  private stripPassword(user: {
    id: string;
    name: string;
    email: string;
    password: string;
    avatarUrl: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): UserPublic {
    const { password: _, ...rest } = user;
    return rest;
  }

  private generateTokens(userId: string): AuthTokens {
    const accessToken = this.jwtService.sign({ userId });
    const refreshToken = this.jwtService.sign(
      { userId },
      { secret: this.refreshSecret, expiresIn: '7d' },
    );
    return { accessToken, refreshToken };
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validatePassword(password: string): boolean {
    return password.length >= MIN_PASSWORD_LENGTH;
  }

  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<{ message: string; email: string }> {
    if (!this.validateEmail(email)) {
      throw new UnauthorizedException('Formato de e-mail inválido');
    }

    if (!this.validatePassword(password)) {
      throw new UnauthorizedException(`A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`);
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;
    const verificationToken = uuidv4();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        avatarUrl,
        emailVerified: false,
        verificationToken,
        verificationTokenExpires,
      },
    });

    try {
      await this.emailService.sendVerificationEmail(
        email.toLowerCase(),
        name,
        verificationToken,
      );
    } catch (error) {
      this.logger.error('Falha ao enviar e-mail de verificação');
    }

    return {
      message:
        'Conta criada com sucesso! Verifique seu e-mail para confirmar o cadastro.',
      email: email.toLowerCase(),
    };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ user: UserPublic; accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    const isPasswordValid = user
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'EMAIL_NOT_VERIFIED: Verifique seu e-mail antes de fazer login.',
      );
    }

    const tokens = this.generateTokens(user.id);
    return { user: this.stripPassword(user), ...tokens };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestException(
        'Token de verificação inválido. Solicite um novo link.',
      );
    }

    if (user.emailVerified) {
      return { message: 'E-mail já verificado. Faça login para continuar.' };
    }

    if (
      !user.verificationTokenExpires ||
      user.verificationTokenExpires < new Date()
    ) {
      throw new BadRequestException(
        'Token de verificação expirado. Solicite um novo link.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });

    return { message: 'E-mail verificado com sucesso! Faça login para continuar.' };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return {
        message:
          'Se o e-mail estiver cadastrado, um novo link de verificação será enviado.',
      };
    }

    if (user.emailVerified) {
      return { message: 'Este e-mail já foi verificado. Faça login para continuar.' };
    }

    const verificationToken = uuidv4();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpires,
      },
    });

    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        user.name,
        verificationToken,
      );
    } catch (error) {
      this.logger.error('Falha ao reenviar e-mail de verificação');
      throw new Error('Erro ao enviar e-mail. Tente novamente mais tarde.');
    }

    return {
      message: 'Novo link de verificação enviado para seu e-mail.',
    };
  }

  async refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.refreshSecret,
      }) as { userId: string };

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }

      if (!user.emailVerified) {
        throw new UnauthorizedException(
          'EMAIL_NOT_VERIFIED: Verifique seu e-mail antes de continuar.',
        );
      }

      const accessToken = this.jwtService.sign({ userId: user.id });
      const newRefreshToken = this.jwtService.sign(
        { userId: user.id },
        { secret: this.refreshSecret, expiresIn: '7d' },
      );

      return { accessToken, refreshToken: newRefreshToken };
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  async getProfile(userId: string): Promise<UserPublic> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'EMAIL_NOT_VERIFIED: Verifique seu e-mail para acessar o perfil.',
      );
    }

    return this.stripPassword(user);
  }

  async validateUser(userId: string): Promise<UserPublic | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) return null;
    return this.stripPassword(user);
  }

  async updateProfile(
    userId: string,
    data: { name?: string; avatarUrl?: string },
  ): Promise<UserPublic> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
    });

    return this.stripPassword(updated);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    if (!this.validatePassword(newPassword)) {
      throw new UnauthorizedException(`A nova senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Senha alterada com sucesso' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return {
        message:
          'Se o e-mail estiver cadastrado, enviaremos um link de recuperação.',
      };
    }

    const resetToken = uuidv4();
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordTokenExpires: resetTokenExpires,
      },
    });

    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.name,
        resetToken,
      );
    } catch (error) {
      this.logger.error('Falha ao enviar e-mail de recuperação');
      throw new Error('Erro ao enviar e-mail de recuperação. Tente novamente mais tarde.');
    }

    return {
      message: 'Se o e-mail estiver cadastrado, enviaremos um link de recuperação.',
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { resetPasswordToken: token },
    });

    if (!user) {
      throw new BadRequestException(
        'Token de recuperação inválido. Solicite um novo link.',
      );
    }

    if (
      !user.resetPasswordTokenExpires ||
      user.resetPasswordTokenExpires < new Date()
    ) {
      throw new BadRequestException(
        'Token de recuperação expirado. Solicite um novo link.',
      );
    }

    if (!this.validatePassword(newPassword)) {
      throw new BadRequestException(`A nova senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`);
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordTokenExpires: null,
      },
    });

    return { message: 'Senha redefinida com sucesso! Faça login com sua nova senha.' };
  }

  async sendDeleteConfirmation(userId: string): Promise<{ message: string; token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token = this.jwtService.sign(
      { userId, code, purpose: 'delete-account' },
      { expiresIn: '15m' },
    );

    await this.emailService.sendDeleteConfirmationEmail(
      user.email,
      user.name,
      code,
    );

    return {
      message: 'E-mail de confirmação enviado. Verifique sua caixa de entrada.',
      token,
    };
  }

  async confirmDeleteAccount(
    token: string,
    code: string,
  ): Promise<{ message: string }> {
    let payload: { userId: string; code: string; purpose: string };
    try {
      payload = this.jwtService.verify(token) as {
        userId: string;
        code: string;
        purpose: string;
      };
    } catch {
      throw new BadRequestException(
        'Token inválido ou expirado. Solicite um novo código.',
      );
    }

    if (payload.purpose !== 'delete-account') {
      throw new BadRequestException('Token inválido para esta operação.');
    }

    if (payload.code !== code) {
      throw new BadRequestException('Código de confirmação incorreto.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    await this.prisma.user.delete({
      where: { id: payload.userId },
    });

    return { message: 'Conta excluída permanentemente' };
  }
}
