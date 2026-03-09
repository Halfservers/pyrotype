import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { AppError } from '../../../../utils/errors'
import { daemonRequest } from '../../../../services/daemon/proxy'
import { logActivity } from '../../../../services/activity'
import { generateUuid } from '../../../../utils/crypto'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function rename(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const { name, description } = await c.req.json()

  if (!name || typeof name !== 'string') {
    throw new AppError('A server name must be provided.', 422, 'ValidationError')
  }

  await prisma.server.update({
    where: { id: server.id },
    data: {
      name,
      description: description !== undefined ? String(description) : server.description,
    },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:settings.rename',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { name, description },
  })

  return c.body(null, 204)
}

export async function reinstall(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const prisma = c.var.prisma

  await prisma.server.update({
    where: { id: server.id },
    data: { status: 'installing' },
  })

  await daemonRequest(
    node, 'POST',
    `/api/servers/${server.uuid}/install`,
  )

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:reinstall',
    ip,
    userId: user.id,
    serverId: server.id,
  })

  return c.json({}, 202)
}

export async function setDockerImage(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const { docker_image } = await c.req.json()

  if (!docker_image) {
    throw new AppError('A Docker image must be provided.', 422, 'ValidationError')
  }

  const egg = await prisma.egg.findUnique({ where: { id: server.eggId } })
  const allowedImages = Object.values(egg?.dockerImages ?? {})

  if (!allowedImages.includes(docker_image)) {
    throw new AppError('The requested Docker image is not allowed for this server.', 400, 'BadRequest')
  }

  await prisma.server.update({
    where: { id: server.id },
    data: { image: docker_image },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:startup.image',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { docker_image },
  })

  return c.body(null, 204)
}

export async function revertDockerImage(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma

  const egg = await prisma.egg.findUnique({ where: { id: server.eggId } })
  const dockerImages = egg?.dockerImages as Record<string, string> | null

  if (!dockerImages || Object.keys(dockerImages).length === 0) {
    throw new AppError('No default docker image available for this server\'s egg.', 400, 'BadRequest')
  }

  const defaultImage = Object.values(dockerImages)[0]

  await prisma.server.update({
    where: { id: server.id },
    data: { image: defaultImage },
  })

  return c.body(null, 204)
}

export async function changeEgg(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const { egg_id, nest_id } = await c.req.json()

  if (server.eggId !== egg_id || server.nestId !== nest_id) {
    const egg = await prisma.egg.findUnique({ where: { id: egg_id } })

    await prisma.server.update({
      where: { id: server.id },
      data: {
        eggId: egg_id,
        nestId: nest_id,
        startup: egg?.startup ?? server.startup,
      },
    })

    const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
    await logActivity(prisma, {
      event: 'server:settings.egg',
      ip,
      userId: user.id,
      serverId: server.id,
      properties: { egg_id, nest_id },
    })
  }

  return c.body(null, 204)
}

export async function previewEggChange(c: AppContext) {
  const prisma = c.var.prisma
  const { egg_id, nest_id } = await c.req.json()

  const egg = await prisma.egg.findUnique({
    where: { id: egg_id },
    include: { variables: true },
  })

  if (!egg) {
    throw new AppError('The specified egg does not exist.', 404, 'NotFound')
  }

  return c.json({
    egg_id: egg.id,
    nest_id,
    name: egg.name,
    docker_images: egg.dockerImages,
    startup: egg.startup,
    variables: egg.variables,
  })
}

export async function applyEggChange(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const {
    egg_id,
    nest_id,
    docker_image,
    startup_command,
    environment,
    should_backup,
    should_wipe,
  } = await c.req.json()

  const operationId = generateUuid()

  await prisma.serverOperation.create({
    data: {
      operationId,
      serverId: server.id,
      userId: user.id,
      type: 'egg_change',
      status: 'pending',
      parameters: {
        egg_id,
        nest_id,
        docker_image,
        startup_command,
        environment,
        should_backup,
        should_wipe,
      },
    },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:software.change-queued',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { operation_id: operationId, egg_id },
  })

  return c.json({
    operation_id: operationId,
    status: 'queued',
  }, 202)
}

export async function getServerOperations(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma

  const operations = await prisma.serverOperation.findMany({
    where: { serverId: server.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return c.json({ operations })
}

export async function getOperationStatus(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const operationId = c.req.param('operationId')

  const operation = await prisma.serverOperation.findFirst({
    where: { operationId: String(operationId), serverId: server.id },
  })

  if (!operation) {
    return c.json({
      operation_id: operationId,
      status: 'unknown',
      server_id: server.id,
    })
  }

  return c.json({
    operation_id: operation.operationId,
    status: operation.status,
    server_id: server.id,
    type: operation.type,
    message: operation.message,
    created_at: operation.createdAt,
    started_at: operation.startedAt,
  })
}
