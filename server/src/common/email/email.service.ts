import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const from = this.configService.get<string>('SMTP_FROM');

    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: (port || 587) === 465,
        auth: { user, pass },
      });
      this.isConfigured = true;
      this.logger.log(`Email transport configured: ${host}:${port || 587}`);
    } else {
      this.logger.warn(
        'SMTP not configured. Email sending will be simulated in console.',
      );
    }
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    const from =
      this.configService.get<string>('SMTP_FROM') || 'noreply@revisaaula.app';

    if (!this.isConfigured || !this.transporter) {
      this.logger.log('━━━━━━━━━━━━ EMAIL (DEV MODE) ━━━━━━━━━━━━');
      this.logger.log(`To: ${options.to}`);
      this.logger.log(`From: ${from}`);
      this.logger.log(`Subject: ${options.subject}`);
      this.logger.log(`Body:\n${options.html.replace(/<[^>]*>/g, '')}`);
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
        html: options.html,
      });
      this.logger.log(`Email sent: ${info.messageId}`);
    } catch (error) {
      this.logger.error('Failed to send email', error);
      throw new Error('Falha ao enviar e-mail de confirmação');
    }
  }

  async sendVerificationEmail(
    to: string,
    userName: string,
    verificationToken: string,
  ): Promise<void> {
    const subject = 'Confirme seu e-mail - Revisa Aula';
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${verificationToken}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #fafafa; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1e293b; font-size: 24px; margin: 0;">Revisa Aula</h1>
          <p style="color: #64748b; font-size: 14px; margin: 4px 0 0;">Confirmação de E-mail</p>
        </div>

        <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
          <p style="color: #1e293b; font-size: 16px; line-height: 1.5;">Olá, <strong>${userName}</strong>!</p>

          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Obrigado por criar sua conta no Revisa Aula! Para começar a usar, confirme seu endereço de e-mail clicando no botão abaixo:
          </p>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${verificationUrl}"
               style="display: inline-block; background: #aa3bff; color: white; font-size: 16px; font-weight: 700; padding: 14px 32px; border-radius: 12px; text-decoration: none;">
              Confirmar E-mail
            </a>
          </div>

          <p style="color: #64748b; font-size: 13px; line-height: 1.5; text-align: center;">
            Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br>
            <span style="color: #aa3bff; font-size: 12px; word-break: break-all;">${verificationUrl}</span>
          </p>

          <p style="color: #94a3b8; font-size: 12px; margin-top: 20px; text-align: center;">
            Este link expira em 24 horas.
          </p>
        </div>

        <div style="text-align: center; margin-top: 16px;">
          <p style="color: #94a3b8; font-size: 12px;">
            Revisa Aula • App de Estudos Inteligente<br>
            Se você não criou uma conta, ignore este e-mail.
          </p>
        </div>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  async sendDeleteConfirmationEmail(
    to: string,
    userName: string,
    confirmationCode: string,
  ): Promise<void> {
    const subject = 'Confirmação de Exclusão de Conta - Revisa Aula';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #fafafa; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1e293b; font-size: 24px; margin: 0;">Revisa Aula</h1>
          <p style="color: #64748b; font-size: 14px; margin: 4px 0 0;">Confirmação de Exclusão de Conta</p>
        </div>

        <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
          <p style="color: #1e293b; font-size: 16px; line-height: 1.5;">Olá, <strong>${userName}</strong>!</p>

          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Recebemos uma solicitação de exclusão da sua conta no Revisa Aula.
            Para confirmar e prosseguir com a exclusão permanente, utilize o código abaixo:
          </p>

          <div style="text-align: center; margin: 24px 0; padding: 16px; background: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;">
            <p style="color: #dc2626; font-size: 12px; font-weight: 600; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">
              Código de Confirmação
            </p>
            <span style="font-size: 28px; font-weight: 800; letter-spacing: 0.15em; color: #b91c1c; font-family: 'Courier New', monospace;">
              ${confirmationCode}
            </span>
            <p style="color: #94a3b8; font-size: 11px; margin: 8px 0 0;">
              Este código expira em 15 minutos.
            </p>
          </div>

          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Se você não solicitou a exclusão da sua conta, ignore este e-mail.
            Nenhuma ação será tomada sem a confirmação através do código acima.
          </p>
        </div>

        <div style="text-align: center; margin-top: 16px;">
          <p style="color: #94a3b8; font-size: 12px;">
            Revisa Aula • App de Estudos Inteligente<br>
            Se tiver dúvidas, entre em contato com nosso suporte.
          </p>
        </div>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }
}
