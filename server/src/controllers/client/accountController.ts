import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { verifyPassword, hashPassword } from '../../utils/crypto';
import { AppError } from '../../utils/errors';

function transformUser(user: {
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

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    res.json(transformUser(user));
  } catch (err) {
    next(err);
  }
}

export async function updateEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('The email and password fields are required.', 422, 'ValidationError');
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      throw new AppError('The password provided was not valid.', 400, 'BadRequestError');
    }

    // Check if email is already taken
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== user.id) {
      throw new AppError('The email has already been taken.', 422, 'ValidationError');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { email },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function updatePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { current_password, password, password_confirmation } = req.body;

    if (!current_password || !password || !password_confirmation) {
      throw new AppError('All password fields are required.', 422, 'ValidationError');
    }

    if (password !== password_confirmation) {
      throw new AppError('The password confirmation does not match.', 422, 'ValidationError');
    }

    if (password.length < 8) {
      throw new AppError('The password must be at least 8 characters.', 422, 'ValidationError');
    }

    const valid = await verifyPassword(current_password, user.password);
    if (!valid) {
      throw new AppError('The password provided was not valid.', 400, 'BadRequestError');
    }

    const hashed = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
