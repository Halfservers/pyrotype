import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem } from '../../utils/response'
import { NotFoundError } from '../../utils/errors'
import { daemonRequest } from '../../services/daemon/proxy'

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
    limits: {
      memory: server.memory,
      swap: server.swap,
      disk: server.disk,
      io: server.io,
      cpu: server.cpu,
      threads: server.threads,
      oom_disabled: server.oomDisabled,
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
  const id = parseInt(c.req.param('id'), 10)
  const existing = await prisma.server.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Server not found')

  const body = await c.req.json()
  const data: any = {}

  if (body.startup !== undefined) data.startup = body.startup
  if (body.egg_id !== undefined) data.eggId = body.egg_id
  if (body.image !== undefined) data.image = body.image
  if (body.skip_scripts !== undefined) data.skipScripts = body.skip_scripts

  const server = await prisma.server.update({ where: { id }, data })

  // Update environment/startup variables if provided
  if (body.environment && typeof body.environment === 'object') {
    for (const [key, value] of Object.entries(body.environment)) {
      const eggVariable = await prisma.eggVariable.findFirst({
        where: { eggId: server.eggId, envVariable: key },
      })
      if (eggVariable) {
        const existing = await prisma.serverVariable.findFirst({
          where: { serverId: server.id, variableId: eggVariable.id },
        })
        if (existing) {
          await prisma.serverVariable.update({
            where: { id: existing.id },
            data: { variableValue: String(value) },
          })
        } else {
          await prisma.serverVariable.create({
            data: {
              serverId: server.id,
              variableId: eggVariable.id,
              variableValue: String(value),
            },
          })
        }
      }
    }
  }

  // Sync startup configuration to the daemon
  try {
    const serverWithNode = await prisma.server.findUnique({
      where: { id: server.id },
      include: { node: true },
    })
    if (serverWithNode?.node) {
      await daemonRequest(serverWithNode.node, 'POST', `/api/servers/${server.uuid}/sync`)
    }
  } catch (e) {
    // Log sync failure but don't fail the request
  }

  return c.json(fractalItem('server', transformServer(server)))
}
