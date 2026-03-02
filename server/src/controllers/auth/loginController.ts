import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { verifyPassword, generateToken } from '../../utils/crypto';
import { destroySession } from '../../services/auth/session';
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

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user: username, password } = req.body;

    if (!username || !password) {
      throw new AppError('The user and password fields are required.', 422, 'ValidationError');
    }

    const field = username.includes('@') ? 'email' : 'username';

    const user = await prisma.user.findFirst({
      where: { [field]: username },
    });

    if (!user) {
      throw new AppError('These credentials do not match our records.', 422, 'AuthenticationError');
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      throw new AppError('These credentials do not match our records.', 422, 'AuthenticationError');
    }

    if (!user.useTotp) {
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
      return;
    }

    // 2FA is enabled: store pending state
    const token = generateToken(32);
    req.session.authConfirmationToken = {
      userId: user.id,
      tokenValue: token,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    };

    res.json({
      data: {
        complete: false,
        confirmation_token: token,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await destroySession(req);
    res.clearCookie('pyrotype_session');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
