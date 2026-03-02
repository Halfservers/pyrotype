import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export async function getServerDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const uuid = String(req.params.uuid);

    const server: any = await prisma.server.findFirst({
      where: { uuid },
      include: {
        allocations: true,
        egg: true,
        serverVariables: { include: { variable: true } },
      },
    });

    if (!server) {
      throw new NotFoundError('Server not found.');
    }

    // Build the configuration structure that the daemon expects.
    // In production, this uses ServerConfigurationStructureService
    // and EggConfigurationService to build complete config.
    res.json({
      settings: {
        uuid: server.uuid,
        meta: {
          name: server.name,
          description: server.description,
        },
        suspended: server.status === 'suspended',
        environment: server.serverVariables.reduce((env: Record<string, string>, sv: any) => {
          if (sv.variable) {
            env[sv.variable.envVariable] = sv.variableValue;
          }
          return env;
        }, {}),
        invocation: server.startup,
        skip_egg_scripts: server.skipScripts,
        build: {
          memory_limit: server.memory,
          swap: server.swap,
          io_weight: server.io,
          cpu_limit: server.cpu,
          threads: server.threads,
          disk_space: server.disk,
          oom_disabled: server.oomDisabled,
        },
        container: {
          image: server.image,
        },
        allocations: {
          default: {
            ip: server.allocations.find((a: any) => a.id === server.allocationId)?.ip ?? '0.0.0.0',
            port: server.allocations.find((a: any) => a.id === server.allocationId)?.port ?? 25565,
          },
          mappings: server.allocations.reduce((map: Record<string, number[]>, a: any) => {
            if (!map[a.ip]) map[a.ip] = [];
            map[a.ip].push(a.port);
            return map;
          }, {}),
        },
      },
      process_configuration: {
        startup: { done: [], user_interaction: [] },
        stop: { type: 'stop', value: null },
        configs: [],
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listServers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const node = req.node!;
    const perPage = Math.min(50, Math.max(1, parseInt(req.query.per_page as string) || 50));
    const page = Math.max(1, parseInt(req.query.page as string) || 1);

    const servers = await prisma.server.findMany({
      where: { nodeId: node.id },
      include: {
        allocations: true,
        egg: true,
        serverVariables: { include: { variable: true } },
      },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    const total = await prisma.server.count({ where: { nodeId: node.id } });

    res.json({
      data: servers.map(server => ({
        uuid: server.uuid,
        settings: {
          uuid: server.uuid,
          name: server.name,
          invocation: server.startup,
          build: {
            memory_limit: server.memory,
            swap: server.swap,
            io_weight: server.io,
            cpu_limit: server.cpu,
            disk_space: server.disk,
          },
          container: { image: server.image },
        },
      })),
      meta: {
        pagination: {
          total,
          count: servers.length,
          per_page: perPage,
          current_page: page,
          total_pages: Math.ceil(total / perPage),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function resetState(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const node = req.node!;

    // Reset servers stuck in installing or restoring states.
    // This is called when the daemon restarts.
    await prisma.server.updateMany({
      where: {
        nodeId: node.id,
        status: { in: ['installing', 'restoring_backup'] },
      },
      data: { status: null },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
