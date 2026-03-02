import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { generateToken } from '../../utils/crypto';
import { logger } from '../../config/logger';

export async function sendResetLink(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;

    // Always return success to prevent email enumeration
    if (!email) {
      res.json({ status: 'We have e-mailed your password reset link!' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = generateToken(32);

      // Delete existing reset tokens for this email
      await prisma.passwordReset.deleteMany({ where: { email } });

      // Create new reset token
      await prisma.passwordReset.create({
        data: {
          email,
          token,
          createdAt: new Date(),
        },
      });

      // In production, send email. For now, log the token.
      logger.info(`Password reset token generated for ${email}: ${token}`);
    }

    // Always return success to avoid revealing whether the email exists
    res.json({ status: 'We have e-mailed your password reset link!' });
  } catch (err) {
    next(err);
  }
}
