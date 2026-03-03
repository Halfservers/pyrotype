import type { Context } from 'hono';
import type { Env, HonoVariables } from '../../../types/env';
import { z } from 'zod';
import { fractalList, fractalItem } from '../../../utils/response';
import { NotFoundError, AppError } from '../../../utils/errors';
import { SYSTEM_PERMISSIONS } from '../../../constants/permissions';

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>;

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

async function resolveServer(prisma: any, serverId: string) {
  const server = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
  });
  if (!server) throw new NotFoundError('Server not found');
  return server;
}

export async function index(c: AppContext) {
  const prisma = c.var.prisma;
  const server = await resolveServer(prisma, c.req.param('server'));

  const subusers = await prisma.subuser.findMany({
    where: { serverId: server.id },
    include: { user: true },
  });

  return c.json(fractalList('subuser', subusers.map(transformSubuser)));
}

export async function view(c: AppContext) {
  const prisma = c.var.prisma;
  const server = await resolveServer(prisma, c.req.param('server'));
  const userUuid = c.req.param('user');

  const user = await prisma.user.findUnique({ where: { uuid: userUuid } });
  if (!user) throw new NotFoundError('User not found');

  const subuser = await prisma.subuser.findUnique({
    where: { userId_serverId: { userId: user.id, serverId: server.id } },
    include: { user: true },
  });

  if (!subuser) throw new NotFoundError('Subuser not found');

  return c.json(fractalItem('subuser', transformSubuser(subuser)));
}

export async function store(c: AppContext) {
  const prisma = c.var.prisma;
  const server = await resolveServer(prisma, c.req.param('server'));
  const body = storeSubuserSchema.parse(await c.req.json());

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

  return c.json(fractalItem('subuser', transformSubuser(subuser)));
}

export async function update(c: AppContext) {
  const prisma = c.var.prisma;
  const server = await resolveServer(prisma, c.req.param('server'));
  const userUuid = c.req.param('user');
  const body = updateSubuserSchema.parse(await c.req.json());

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

  return c.json(fractalItem('subuser', transformSubuser(updated)));
}

export async function deleteFn(c: AppContext) {
  const prisma = c.var.prisma;
  const server = await resolveServer(prisma, c.req.param('server'));
  const userUuid = c.req.param('user');

  const user = await prisma.user.findUnique({ where: { uuid: userUuid } });
  if (!user) throw new NotFoundError('User not found');

  const subuser = await prisma.subuser.findUnique({
    where: { userId_serverId: { userId: user.id, serverId: server.id } },
  });

  if (!subuser) throw new NotFoundError('Subuser not found');

  await prisma.subuser.delete({ where: { id: subuser.id } });

  return c.body(null, 204);
}
