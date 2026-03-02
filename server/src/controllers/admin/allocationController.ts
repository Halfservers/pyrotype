import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { fractalPaginated } from '../../utils/response';
import { paginationSchema, getPaginationOffset } from '../../utils/pagination';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors';

function transformAllocation(alloc: any) {
  return {
    id: alloc.id,
    ip: alloc.ip,
    alias: alloc.ipAlias,
    port: alloc.port,
    notes: alloc.notes,
    assigned: alloc.serverId !== null,
    created_at: alloc.createdAt.toISOString(),
    updated_at: alloc.updatedAt.toISOString(),
  };
}

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const nodeId = parseInt(req.params.id as string, 10);
    const node = await prisma.node.findUnique({ where: { id: nodeId } });
    if (!node) throw new NotFoundError('Node not found');

    const pagination = paginationSchema.parse(req.query);
    const { skip, take } = getPaginationOffset(pagination);

    const filterIp = req.query['filter[ip]'] as string | undefined;
    const filterPort = req.query['filter[port]'] as string | undefined;
    const filterServerId = req.query['filter[server_id]'] as string | undefined;

    const where: any = { nodeId };
    if (filterIp) where.ip = filterIp;
    if (filterPort) where.port = parseInt(filterPort, 10);
    if (filterServerId !== undefined) {
      if (!filterServerId || filterServerId === '0') {
        where.serverId = null;
      } else {
        where.serverId = parseInt(filterServerId, 10);
      }
    }

    const [allocations, total] = await Promise.all([
      prisma.allocation.findMany({ where, skip, take, orderBy: { id: 'asc' } }),
      prisma.allocation.count({ where }),
    ]);

    res.json(fractalPaginated('allocation', allocations.map(transformAllocation), total, pagination.page, pagination.per_page));
  } catch (err) {
    next(err);
  }
}

export async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const nodeId = parseInt(req.params.id as string, 10);
    const node = await prisma.node.findUnique({ where: { id: nodeId } });
    if (!node) throw new NotFoundError('Node not found');

    const { ip, ports, alias } = req.body;

    if (!ip || !ports || !Array.isArray(ports)) {
      throw new ValidationError('IP and ports are required');
    }

    const allocationsToCreate: { nodeId: number; ip: string; port: number; ipAlias: string | null }[] = [];

    for (const portEntry of ports) {
      const parsed = parsePortRange(portEntry);
      for (const port of parsed) {
        allocationsToCreate.push({
          nodeId,
          ip,
          port,
          ipAlias: alias || null,
        });
      }
    }

    if (allocationsToCreate.length > 0) {
      for (const alloc of allocationsToCreate) {
        const existing = await prisma.allocation.findFirst({
          where: { nodeId: alloc.nodeId, ip: alloc.ip, port: alloc.port },
        });
        if (!existing) {
          await prisma.allocation.create({ data: alloc });
        }
      }
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function deleteAllocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const nodeId = parseInt(req.params.id as string, 10);
    const allocationId = parseInt(req.params.allocationId as string, 10);

    const allocation = await prisma.allocation.findFirst({
      where: { id: allocationId, nodeId },
    });
    if (!allocation) throw new NotFoundError('Allocation not found');

    if (allocation.serverId !== null) {
      throw new ConflictError('Cannot delete an allocation that is assigned to a server.');
    }

    await prisma.allocation.delete({ where: { id: allocationId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

function parsePortRange(entry: string): number[] {
  if (entry.includes('-')) {
    const [startStr, endStr] = entry.split('-');
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end) || start > end || start < 1 || end > 65535) {
      throw new ValidationError(`Invalid port range: ${entry}`);
    }
    if (end - start > 1000) {
      throw new ValidationError('Port range cannot exceed 1000 ports');
    }
    const ports: number[] = [];
    for (let p = start; p <= end; p++) {
      ports.push(p);
    }
    return ports;
  }
  const port = parseInt(entry, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new ValidationError(`Invalid port: ${entry}`);
  }
  return [port];
}
