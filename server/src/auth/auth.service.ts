import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email/email.service';

const SALT_ROUNDS = 12;

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  private readonly refreshSecret =
    process.env.REFRESH_SECRET || 'dev-refresh-secret-change-in-production';

  private stripPassword(user: {
    id: string;
    name: string;
    email: string;
    password: string;
    avatarUrl: string;
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

  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<{ user: UserPublic; accessToken: string; refreshToken: string }> {
    if (!this.validateEmail(email)) {
      throw new UnauthorizedException('Formato de e-mail inválido');
    }

    if (password.length < 6) {
      throw new UnauthorizedException('A senha deve ter no mínimo 6 caracteres');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;

    const newUser = await this.prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        avatarUrl,
      },
    });

    const tokens = this.generateTokens(newUser.id);
    return { user: this.stripPassword(newUser), ...tokens };
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

    const tokens = this.generateTokens(user.id);
    return { user: this.stripPassword(user), ...tokens };
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

      // Gera NOVO par de tokens (rotação completa)
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
    if (newPassword.length < 6) {
      throw new UnauthorizedException('A nova senha deve ter no mínimo 6 caracteres');
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

  async sendDeleteConfirmation(userId: string): Promise<{ message: string; token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    // Gera código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Gera token JWT com userId + código, válido por 15 minutos
    const token = this.jwtService.sign(
      { userId, code, purpose: 'delete-account' },
      { expiresIn: '15m' },
    );

    // Envia e-mail com o código
    await this.emailService.sendDeleteConfirmationEmail(
      user.email,
      user.name,
      code,
    );

    // Retorna o token para ser usado na confirmação
    // (NUNCA retornaríamos o código — apenas o token JWT)
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

    // O CASCADE do Prisma + SQLite remove automaticamente todos os
    // registros relacionados
    await this.prisma.user.delete({
      where: { id: payload.userId },
    });

    return { message: 'Conta excluída permanentemente' };
  }
}
