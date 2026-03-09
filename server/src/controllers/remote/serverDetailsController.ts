import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { NotFoundError } from '../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function parseJsonField(value: string | null | undefined): any {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function buildProcessConfiguration(egg: any) {
  const startup = parseJsonField(egg.configStartup) || {}
  const stop = parseJsonField(egg.configStop) || {}
  const logs = parseJsonField(egg.configLogs) || {}
  const files = parseJsonField(egg.configFiles) || {}

  return {
    startup: {
      done: startup.done ?? [],
      user_interaction: startup.user_interaction ?? [],
      strip_ansi: startup.strip_ansi ?? false,
    },
    stop: {
      type: stop.type ?? 'stop',
      value: stop.value ?? null,
    },
    configs: Object.entries(files).map(([path, data]: [string, any]) => ({
      parser: data.parser ?? 'file',
      file: path,
      replace: data.find ?? {},
    })),
  }
}

function buildServerResponse(server: any) {
  const defaultAlloc = server.allocations.find((a: any) => a.id === server.allocationId)

  return {
    settings: {
      uuid: server.uuid,
      meta: {
        name: server.name,
        description: server.description,
      },
      suspended: server.status === 'suspended',
      environment: buildEnvironment(server),
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
          ip: defaultAlloc?.ip ?? '0.0.0.0',
          port: defaultAlloc?.port ?? 25565,
        },
        mappings: server.allocations.reduce((map: Record<string, number[]>, a: any) => {
          if (!map[a.ip]) map[a.ip] = []
          map[a.ip].push(a.port)
          return map
        }, {}),
      },
      egg: server.egg ? {
        id: server.egg.uuid,
        file_denylist: server.egg.fileDenylist ?? [],
      } : undefined,
      feature_limits: {
        databases: server.databaseLimit ?? 0,
        allocations: server.allocationLimit ?? 0,
        backups: server.backupLimit ?? 0,
      },
    },
    process_configuration: server.egg
      ? buildProcessConfiguration(server.egg)
      : { startup: { done: [], user_interaction: [] }, stop: { type: 'stop', value: null }, configs: [] },
  }
}

function buildEnvironment(server: any): Record<string, string> {
  const env: Record<string, string> = {}

  // Add egg variables with their server overrides or defaults
  for (const sv of (server.serverVariables ?? [])) {
    if (sv.variable) {
      env[sv.variable.envVariable] = sv.variableValue || sv.variable.defaultValue || ''
    }
  }

  // Standard Pterodactyl environment variables
  const defaultAlloc = server.allocations?.find((a: any) => a.id === server.allocationId)
  env.STARTUP = server.startup || ''
  env.SERVER_MEMORY = String(server.memory)
  env.SERVER_IP = defaultAlloc?.ip ?? '0.0.0.0'
  env.SERVER_PORT = String(defaultAlloc?.port ?? 25565)
  env.P_SERVER_LOCATION = ''
  env.P_SERVER_UUID = server.uuid
  env.P_SERVER_ALLOCATION_LIMIT = String(server.allocationLimit ?? 0)

  return env
}

export async function getServerDetails(c: AppContext) {
  const prisma = c.var.prisma
  const uuid = c.req.param('uuid')

  const server: any = await prisma.server.findFirst({
    where: { uuid },
    include: {
      allocations: true,
      egg: true,
      serverVariables: { include: { variable: true } },
    },
  })

  if (!server) {
    throw new NotFoundError('Server not found.')
  }

  return c.json(buildServerResponse(server))
}

export async function listServers(c: AppContext) {
  const prisma = c.var.prisma
  const node = c.var.node!
  const perPage = Math.min(50, Math.max(1, parseInt(c.req.query('per_page') ?? '') || 50))
  const page = Math.max(1, parseInt(c.req.query('page') ?? '') || 1)

  const servers = await prisma.server.findMany({
    where: { nodeId: node.id },
    include: {
      allocations: true,
      egg: true,
      serverVariables: { include: { variable: true } },
    },
    skip: (page - 1) * perPage,
    take: perPage,
  })

  const total = await prisma.server.count({ where: { nodeId: node.id } })

  return c.json({
    data: servers.map((server: any) => buildServerResponse(server)),
    meta: {
      pagination: {
        total,
        count: servers.length,
        per_page: perPage,
        current_page: page,
        total_pages: Math.ceil(total / perPage),
      },
    },
  })
}

export async function resetState(c: AppContext) {
  const prisma = c.var.prisma
  const node = c.var.node!

  await prisma.server.updateMany({
    where: {
      nodeId: node.id,
      status: { in: ['installing', 'restoring_backup'] },
    },
    data: { status: null },
  })

  return c.body(null, 204)
}
