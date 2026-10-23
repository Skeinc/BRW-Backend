import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { EnvironmentVariables } from '../../config/environment-variables.js';
import type { SendMailInput } from './mail.types.js';

/** Sends email over SMTP. It stays disabled (and `send` does nothing) while SMTP_HOST is not set. */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | undefined;
  private readonly from: string;

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    const host: string | undefined = configService.get('SMTP_HOST', { infer: true });
    const user: string | undefined = configService.get('SMTP_USER', { infer: true });
    const password: string | undefined = configService.get('SMTP_PASSWORD', { infer: true });
    this.from = configService.get('MAIL_FROM', { infer: true }) ?? user ?? 'no-reply@localhost';
    if (host === undefined) {
      this.logger.warn('SMTP_HOST is not set: email notifications are disabled');
      return;
    }
    this.transporter = createTransport({
      host,
      port: configService.getOrThrow('SMTP_PORT', { infer: true }),
      secure: configService.getOrThrow('SMTP_SECURE', { infer: true }),
      auth: user !== undefined && password !== undefined ? { user, pass: password } : undefined,
    });
  }

  /** Whether emails can be sent. */
  get isEnabled(): boolean {
    return this.transporter !== undefined;
  }

  /** Sends one email; rejects when the SMTP server refuses it. Does nothing when mail is disabled. */
  async send({ to, subject, text, replyTo }: SendMailInput): Promise<void> {
    if (this.transporter === undefined) {
      return;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, text, replyTo });
  }
}
