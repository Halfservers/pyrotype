import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem, fractalPaginated } from '../../utils/response'
import { paginationSchema, getPaginationOffset } from '../../utils/pagination'
import { NotFoundError } from '../../utils/errors'
import { generateUuid } from '../../utils/crypto'
import { daemonRequest } from '../../services/daemon/proxy'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformServer(server: any) {
  const attrs: any = {
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

  return attrs
}

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const pagination = paginationSchema.parse({
    page: c.req.query('page'),
    per_page: c.req.query('per_page'),
  })
  const { skip, take } = getPaginationOffset(pagination)

  const filterName = c.req.query('filter[name]')
  const filterUuid = c.req.query('filter[uuid]')
  const filterExternalId = c.req.query('filter[external_id]')
  const filterImage = c.req.query('filter[image]')

  const where: any = {}
  if (filterName) where.name = { contains: filterName }
  if (filterUuid) where.uuid = { contains: filterUuid }
  if (filterExternalId) where.externalId = filterExternalId
  if (filterImage) where.image = { contains: filterImage }

  const sort = c.req.query('sort')
  const orderBy: any = {}
  if (sort === 'id' || sort === '-id') {
    orderBy.id = sort.startsWith('-') ? 'desc' : 'asc'
  } else if (sort === 'uuid' || sort === '-uuid') {
    orderBy.uuid = sort.startsWith('-') ? 'desc' : 'asc'
  } else {
    orderBy.id = 'asc'
  }

  const [servers, total] = await Promise.all([
    prisma.server.findMany({ where, skip, take, orderBy }),
    prisma.server.count({ where }),
  ])

  return c.json(fractalPaginated('server', servers.map(transformServer), total, pagination.page, pagination.per_page))
}

export async function view(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const server = await prisma.server.findUnique({ where: { id } })
  if (!server) throw new NotFoundError('Server not found')

  return c.json(fractalItem('server', transformServer(server)))
}

export async function store(c: AppContext) {
  const prisma = c.var.prisma
  const body = await c.req.json()

  const uuid = generateUuid()
  const uuidShort = uuid.slice(0, 8)

  // Create server record, assign additional allocations, and create egg variable
  // records all inside a single transaction — mirrors ServerCreationService::handle()
  const server = await prisma.$transaction(async (tx) => {
    const created = await tx.server.create({
      data: {
        uuid,
        uuidShort,
        externalId: body.external_id || null,
        name: body.name,
        description: body.description || '',
        // STATUS_INSTALLING — server is being set up, not yet ready
        status: 'installing',
        ownerId: body.owner_id,
        nodeId: body.node_id,
        allocationId: body.allocation_id,
        nestId: body.nest_id,
        eggId: body.egg_id,
        startup: body.startup,
        image: body.image,
        memory: body.memory ?? 0,
        swap: body.swap ?? 0,
        disk: body.disk ?? 0,
        io: body.io ?? 500,
        cpu: body.cpu ?? 0,
        threads: body.threads || null,
        oomDisabled: body.oom_disabled ?? true,
        databaseLimit: body.database_limit ?? null,
        allocationLimit: body.allocation_limit ?? null,
        backupLimit: body.backup_limit ?? null,
        backupStorageLimit: body.backup_storage_limit ?? null,
        skipScripts: body.skip_scripts ?? false,
      },
    })

    // Assign primary allocation and any additional allocations to this server
    // by updating their server_id — matches storeAssignedAllocations()
    const allocationIds: number[] = [body.allocation_id]
    if (Array.isArray(body.allocation_additional)) {
      for (const id of body.allocation_additional) {
        allocationIds.push(id)
      }
    }
    await tx.allocation.updateMany({
      where: { id: { in: allocationIds } },
      data: { serverId: created.id },
    })

    // Create a ServerVariable record for every egg variable using the value
    // supplied in the environment map, falling back to the variable's default
    // value — matches storeEggVariables()
    const eggVariables = await tx.eggVariable.findMany({
      where: { eggId: created.eggId },
    })

    const environment: Record<string, string> =
      body.environment && typeof body.environment === 'object'
        ? body.environment
        : {}

    if (eggVariables.length > 0) {
      await tx.serverVariable.createMany({
        data: eggVariables.map((variable) => ({
          serverId: created.id,
          variableId: variable.id,
          variableValue: environment[variable.envVariable] ?? variable.defaultValue ?? '',
        })),
      })
    }

    return created
  })

  // After the DB transaction succeeds, tell the daemon to create the server
  // container. On failure we roll back by deleting the server record (force),
  // matching the DaemonConnectionException handling in ServerCreationService.
  const serverWithRelations = await prisma.server.findUnique({
    where: { id: server.id },
    include: {
      node: true,
      egg: true,
      allocation: true,
      allocations: true,
    },
  })

  if (serverWithRelations?.node) {
    const node = serverWithRelations.node
    const allocation = serverWithRelations.allocation
    const egg = serverWithRelations.egg

    // Build the allocation port mappings grouped by IP — mirrors getAllocationMappings()
    const mappings: Record<string, number[]> = {}
    for (const alloc of serverWithRelations.allocations) {
      if (!mappings[alloc.ip]) mappings[alloc.ip] = []
      mappings[alloc.ip].push(alloc.port)
    }
    // Ensure the primary allocation IP is always present in mappings
    if (allocation && !mappings[allocation.ip]) {
      mappings[allocation.ip] = [allocation.port]
    }

    // Resolve environment variables: egg variables first, then built-in panel vars
    // Mirrors EnvironmentService::handle()
    const serverVariables = await prisma.serverVariable.findMany({
      where: { serverId: server.id },
      include: { variable: true },
    })
    const resolvedEnv: Record<string, string> = {}
    for (const sv of serverVariables) {
      resolvedEnv[sv.variable.envVariable] = sv.variableValue ?? sv.variable.defaultValue ?? ''
    }
    // Built-in panel environment variables
    resolvedEnv['STARTUP'] = server.startup
    resolvedEnv['P_SERVER_UUID'] = server.uuid

    // Build the daemon create payload — mirrors ServerConfigurationStructureService::returnCurrentFormat()
    const daemonPayload = {
      uuid: server.uuid,
      meta: {
        name: server.name,
        description: server.description,
      },
      suspended: false,
      environment: resolvedEnv,
      invocation: server.startup,
      skip_egg_scripts: server.skipScripts,
      build: {
        memory_limit: server.memory + server.overheadMemory,
        swap: server.swap,
        io_weight: server.io,
        cpu_limit: server.cpu,
        threads: server.threads ?? null,
        disk_space: server.disk,
        oom_disabled: server.oomDisabled,
      },
      container: {
        image: server.image,
        oom_disabled: server.oomDisabled,
        requires_rebuild: false,
      },
      allocations: {
        force_outgoing_ip: egg?.forceOutgoingIp ?? false,
        default: allocation
          ? { ip: allocation.ip, port: allocation.port }
          : { ip: '0.0.0.0', port: 0 },
        mappings,
      },
    }

    try {
      await daemonRequest(node, 'POST', '/api/servers', daemonPayload)
    } catch (e) {
      // Roll back: delete server record (and cascaded relations) if daemon
      // creation fails — matches the force-delete in ServerCreationService
      await prisma.server.delete({ where: { id: server.id } }).catch(() => {})
      throw e
    }
  }

  return c.json(fractalItem('server', transformServer(server)), 201)
}

export async function deleteServer(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const force = c.req.param('force') === 'force'

  const server = await prisma.server.findUnique({ where: { id } })
  if (!server) throw new NotFoundError('Server not found')

  // Ask daemon to delete server files before removing the panel record
  const serverWithNode = await prisma.server.findUnique({
    where: { id: server.id },
    include: { node: true },
  })

  if (serverWithNode?.node) {
    try {
      await daemonRequest(serverWithNode.node, 'DELETE', `/api/servers/${server.uuid}`)
    } catch (e) {
      if (!force) {
        throw e
      }
      // Force delete: log but don't fail if daemon is unreachable
    }
  }

  await prisma.server.delete({ where: { id } })

  return c.body(null, 204)
}

export async function addServerMount(c: AppContext) {
  const prisma = c.var.prisma
  const serverId = parseInt(c.req.param('id'), 10)
  const { mount_id } = await c.req.json()

  await prisma.server.findUniqueOrThrow({ where: { id: serverId } })
  await prisma.mount.findUniqueOrThrow({ where: { id: mount_id } })

  await prisma.mountServer.create({
    data: { serverId, mountId: mount_id },
  }).catch(() => {}) // Ignore duplicate

  return c.body(null, 204)
}

export async function deleteServerMount(c: AppContext) {
  const prisma = c.var.prisma
  const serverId = parseInt(c.req.param('id'), 10)
  const mountId = parseInt(c.req.param('mountId'), 10)

  await prisma.mountServer.delete({
    where: { serverId_mountId: { serverId, mountId } },
  })

  return c.body(null, 204)
}
