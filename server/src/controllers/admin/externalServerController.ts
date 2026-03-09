import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem } from '../../utils/response'
import { NotFoundError } from '../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformServer(server: any) {
  return {
    id: server.id,
    external_id: server.externalId,
    uuid: server.uuid,
    identifier: server.uuidShort,
    name: server.name,
    description: server.description,
    status: server.status,
    suspended: server.status === 'suspended',
    limits: {
      memory: server.memory,
      swap: server.swap,
      disk: server.disk,
      io: server.io,
      cpu: server.cpu,
      threads: server.threads,
      oom_disabled: server.oomDisabled,
    },
    feature_limits: {
      databases: server.databaseLimit ?? 0,
      allocations: server.allocationLimit ?? 0,
      backups: server.backupLimit ?? 0,
      backup_storage: server.backupStorageLimit ?? 0,
    },
    user: server.ownerId,
    node: server.nodeId,
    allocation: server.allocationId,
    nest: server.nestId,
    egg: server.eggId,
    container: {
      startup_command: server.startup,
      image: server.image,
      installed_at: server.installedAt?.toISOString() ?? null,
    },
    created_at: server.createdAt.toISOString(),
    updated_at: server.updatedAt.toISOString(),
  }
}

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const externalId = c.req.param('externalId')
  const server = await prisma.server.findFirst({ where: { externalId } })
  if (!server) throw new NotFoundError('Server not found')

  return c.json(fractalItem('server', transformServer(server)))
}
