import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { verifyPassword } from '../../utils/crypto';
import { verifyTotpCode } from '../../services/auth/twoFactor';
import { AppError } from '../../utils/errors';

function transformUserForResponse(user: {
  id: number;
  uuid: string;
  username: string;
  email: string;
  language: string;
  rootAdmin: boolean;
  useTotp: boolean;
  nameFirst: string | null;
  nameLast: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    object: 'user',
    attributes: {
      id: user.id,
      uuid: user.uuid,
      username: user.username,
      email: user.email,
      language: user.language.trim(),
      root_admin: user.rootAdmin,
      use_totp: user.useTotp,
      name_first: user.nameFirst,
      name_last: user.nameLast,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    },
  };
}

export async function handle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { confirmation_token, authentication_code, recovery_token } = req.body;

    const details = req.session.authConfirmationToken;
    if (!details || !details.userId || !details.tokenValue || !details.expiresAt) {
      throw new AppError(
        'The authentication token provided has expired, please refresh the page and try again.',
        422,
        'AuthenticationError',
      );
    }

    if (Date.now() > details.expiresAt) {
      throw new AppError(
        'The authentication token provided has expired, please refresh the page and try again.',
        422,
        'AuthenticationError',
      );
    }

    if (!confirmation_token || confirmation_token !== details.tokenValue) {
      throw new AppError('These credentials do not match our records.', 422, 'AuthenticationError');
    }

    const user = await prisma.user.findUnique({
      where: { id: details.userId },
      include: { recoveryTokens: true },
    });

    if (!user) {
      throw new AppError(
        'The authentication token provided has expired, please refresh the page and try again.',
        422,
        'AuthenticationError',
      );
    }

    // Try recovery token first
    if (recovery_token) {
      let found = false;
      for (const rt of user.recoveryTokens) {
        const valid = await verifyPassword(recovery_token, rt.token);
        if (valid) {
          await prisma.recoveryToken.delete({ where: { id: rt.id } });
          found = true;
          break;
        }
      }
      if (!found) {
        throw new AppError('The recovery token provided is not valid.', 422, 'AuthenticationError');
      }
    } else {
      // Verify TOTP code
      if (!authentication_code || !user.totpSecret) {
        throw new AppError('Two-factor authentication checkpoint failed.', 422, 'AuthenticationError');
      }

      const isValid = verifyTotpCode(user.totpSecret, authentication_code);
      if (!isValid) {
        throw new AppError('Two-factor authentication checkpoint failed.', 422, 'AuthenticationError');
      }
    }

    // Success: complete login
    req.session.authConfirmationToken = undefined;
    req.session.userId = user.id;
    req.session.twoFactorVerified = true;
    req.session.pendingUserId = undefined;

    res.json({
      data: {
        complete: true,
        intended: '/',
        user: transformUserForResponse(user),
      },
    });
  } catch (err) {
    next(err);
  }
}
