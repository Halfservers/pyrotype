import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '../../config';
import { logger } from '../../config/logger';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.MAIL_HOST,
      port: config.MAIL_PORT,
      secure: config.MAIL_PORT === 465,
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${config.APP_URL}/auth/password/reset/${token}`;
  try {
    await getTransporter().sendMail({
      from: config.MAIL_FROM,
      to: email,
      subject: 'Reset Password',
      html: `<p>You are receiving this email because a password reset was requested.</p>
             <p><a href="${resetUrl}">Click here to reset your password</a></p>
             <p>If you did not request a password reset, no further action is required.</p>`,
    });
  } catch (error) {
    logger.error('Failed to send password reset email:', error);
  }
}
