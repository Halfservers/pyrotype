import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../../config/database';
import { fractalList, fractalItem } from '../../../utils/response';
import { NotFoundError, AppError } from '../../../utils/errors';
import { SYSTEM_PERMISSIONS } from '../../../constants/permissions';

const storeSubuserSchema = z.object({
  email: z.string().email(),
  permissions: z.array(z.string()),
});

const updateSubuserSchema = z.object({
  permissions: z.array(z.string()),
});

function transformSubuser(subuser: any) {
  const user = subuser.user;
  return {
    uuid: user?.uuid ?? '',
    username: user?.username ?? '',
    email: user?.email ?? '',
    image: `https://gravatar.com/avatar/${user?.email ?? ''}`,
    '2fa_enabled': user?.useTotp ?? false,
    created_at: subuser.createdAt.toISOString(),
    permissions: subuser.permissions as string[],
  };
}

function sanitizePermissions(permissions: string[]): string[] {
  const allowed = new Set<string>();
  for (const [prefix, group] of Object.entries(SYSTEM_PERMISSIONS)) {
    for (const key of Object.keys(group.keys)) {
      allowed.add(`${prefix}.${key}`);
    }
  }

  const cleaned = permissions.filter((p) => allowed.has(p));
  if (!cleaned.includes('websocket.connect')) {
    cleaned.push('websocket.connect');
  }
  return [...new Set(cleaned)];
}

async function resolveServer(serverId: string) {
  const server = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
  });
  if (!server) throw new NotFoundError('Server not found');
  return server;
}

export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));

    const subusers = await prisma.subuser.findMany({
      where: { serverId: server.id },
      include: { user: true },
    });

    res.json(fractalList('subuser', subusers.map(transformSubuser)));
  } catch (err) {
    next(err);
  }
}

export async function view(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const userUuid = String(req.params.user);

    const user = await prisma.user.findUnique({ where: { uuid: userUuid } });
    if (!user) throw new NotFoundError('User not found');

    const subuser = await prisma.subuser.findUnique({
      where: { userId_serverId: { userId: user.id, serverId: server.id } },
      include: { user: true },
    });

    if (!subuser) throw new NotFoundError('Subuser not found');

    res.json(fractalItem('subuser', transformSubuser(subuser)));
  } catch (err) {
    next(err);
  }
}

export async function store(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const body = storeSubuserSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({ where: { email: body.email } });
    if (!targetUser) {
      throw new NotFoundError('A user with that email address does not exist.');
    }

    if (targetUser.id === server.ownerId) {
      throw new AppError('Cannot add the server owner as a subuser.', 400, 'ServerOwnerSubuser');
    }

    const existing = await prisma.subuser.findUnique({
      where: { userId_serverId: { userId: targetUser.id, serverId: server.id } },
    });

    if (existing) {
      throw new AppError('This user is already a subuser of this server.', 409, 'SubuserExists');
    }

    const permissions = sanitizePermissions(body.permissions);

    const subuser = await prisma.subuser.create({
      data: {
        userId: targetUser.id,
        serverId: server.id,
        permissions,
      },
      include: { user: true },
    });

    res.json(fractalItem('subuser', transformSubuser(subuser)));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const userUuid = String(req.params.user);
    const body = updateSubuserSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { uuid: userUuid } });
    if (!user) throw new NotFoundError('User not found');

    const subuser = await prisma.subuser.findUnique({
      where: { userId_serverId: { userId: user.id, serverId: server.id } },
    });

    if (!subuser) throw new NotFoundError('Subuser not found');

    const permissions = sanitizePermissions(body.permissions);

    const updated = await prisma.subuser.update({
      where: { id: subuser.id },
      data: { permissions },
      include: { user: true },
    });

    res.json(fractalItem('subuser', transformSubuser(updated)));
  } catch (err) {
    next(err);
  }
}

export async function deleteFn(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const userUuid = String(req.params.user);

    const user = await prisma.user.findUnique({ where: { uuid: userUuid } });
    if (!user) throw new NotFoundError('User not found');

    const subuser = await prisma.subuser.findUnique({
      where: { userId_serverId: { userId: user.id, serverId: server.id } },
    });

    if (!subuser) throw new NotFoundError('Subuser not found');

    await prisma.subuser.delete({ where: { id: subuser.id } });

    res.status(204).json([]);
  } catch (err) {
    next(err);
  }
}
