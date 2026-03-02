import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { fractalItem, fractalPaginated } from '../../utils/response';
import { paginationSchema, getPaginationOffset } from '../../utils/pagination';
import { NotFoundError } from '../../utils/errors';
import { hashPassword, generateUuid } from '../../utils/crypto';

interface UserAttributes {
  id: number;
  external_id: string | null;
  uuid: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  language: string;
  root_admin: boolean;
  '2fa_enabled': boolean;
  created_at: string;
  updated_at: string;
}

function transformUser(user: any): UserAttributes {
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
    const pagination = paginationSchema.parse(req.query);
    const { skip, take } = getPaginationOffset(pagination);

    const filterEmail = req.query['filter[email]'] as string | undefined;
    const filterUuid = req.query['filter[uuid]'] as string | undefined;
    const filterUsername = req.query['filter[username]'] as string | undefined;
    const filterExternalId = req.query['filter[external_id]'] as string | undefined;

    const where: any = {};
    if (filterEmail) where.email = { contains: filterEmail };
    if (filterUuid) where.uuid = { contains: filterUuid };
    if (filterUsername) where.username = { contains: filterUsername };
    if (filterExternalId) where.externalId = filterExternalId;

    const sort = req.query.sort as string | undefined;
    const orderBy: any = {};
    if (sort === 'id' || sort === '-id') {
      orderBy.id = sort.startsWith('-') ? 'desc' : 'asc';
    } else if (sort === 'uuid' || sort === '-uuid') {
      orderBy.uuid = sort.startsWith('-') ? 'desc' : 'asc';
    } else {
      orderBy.id = 'asc';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take, orderBy }),
      prisma.user.count({ where }),
    ]);

    res.json(
      fractalPaginated('user', users.map(transformUser), total, pagination.page, pagination.per_page),
    );
  } catch (err) {
    next(err);
  }
}

export async function view(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');

    res.json(fractalItem('user', transformUser(user)));
  } catch (err) {
    next(err);
  }
}

export async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { external_id, username, email, name_first, name_last, password, root_admin, language } = req.body;

    const hashedPassword = password ? await hashPassword(password) : await hashPassword(generateUuid());

    const user = await prisma.user.create({
      data: {
        uuid: generateUuid(),
        externalId: external_id || null,
        username,
        email,
        nameFirst: name_first,
        nameLast: name_last || null,
        password: hashedPassword,
        rootAdmin: root_admin ?? false,
        language: language ?? 'en',
      },
    });

    res.status(201).json({
      ...fractalItem('user', transformUser(user)),
      meta: {
        resource: `/api/application/users/${user.id}`,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('User not found');

    const { external_id, username, email, name_first, name_last, password, root_admin, language } = req.body;

    const data: any = {};
    if (external_id !== undefined) data.externalId = external_id || null;
    if (username !== undefined) data.username = username;
    if (email !== undefined) data.email = email;
    if (name_first !== undefined) data.nameFirst = name_first;
    if (name_last !== undefined) data.nameLast = name_last || null;
    if (root_admin !== undefined) data.rootAdmin = root_admin;
    if (language !== undefined) data.language = language;
    if (password) data.password = await hashPassword(password);

    const user = await prisma.user.update({ where: { id }, data });

    res.json(fractalItem('user', transformUser(user)));
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const user = await prisma.user.findUnique({
      where: { id },
      include: { servers: { select: { id: true } } },
    });
    if (!user) throw new NotFoundError('User not found');

    if (user.servers.length > 0) {
      res.status(409).json({
        errors: [{
          code: 'ConflictError',
          status: '409',
          detail: 'Cannot delete a user that has active servers attached.',
        }],
      });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
