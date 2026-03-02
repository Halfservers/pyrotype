import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { fractalItem } from '../../utils/response';
import { NotFoundError } from '../../utils/errors';

function transformUser(user: any) {
  return {
    id: user.id,
    external_id: user.externalId,
    uuid: user.uuid,
    username: user.username,
    email: user.email,
    first_name: user.nameFirst,
    last_name: user.nameLast,
    language: user.language,
    root_admin: user.rootAdmin,
    '2fa_enabled': user.useTotp,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const externalId = req.params.externalId as string;
    const user = await prisma.user.findFirst({ where: { externalId } });
    if (!user) throw new NotFoundError('User not found');

    res.json(fractalItem('user', transformUser(user)));
  } catch (err) {
    next(err);
  }
}
