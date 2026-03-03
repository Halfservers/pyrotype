import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { AppError } from '../../../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function rename(c: AppContext) {
  const server = c.var.server!
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

  // TODO: Activity log: server:settings.rename / server:settings.description

  return c.body(null, 204)
}

export async function reinstall(c: AppContext) {
  const server = c.var.server!

  // In production, trigger server reinstallation through the daemon.
  // TODO: Activity log: server:reinstall

  return c.json({}, 202)
}

export async function setDockerImage(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const { docker_image } = await c.req.json()

  if (!docker_image) {
    throw new AppError('A Docker image must be provided.', 422, 'ValidationError')
  }

  // In production, validate the docker image is in the egg's allowed list.
  const egg = await prisma.egg.findUnique({ where: { id: server.eggId } })
  const allowedImages = Object.values(egg?.dockerImages ?? {})

  if (!allowedImages.includes(docker_image)) {
    throw new AppError('The requested Docker image is not allowed for this server.', 400, 'BadRequest')
  }

  await prisma.server.update({
    where: { id: server.id },
    data: { image: docker_image },
  })

  // TODO: Activity log: server:startup.image

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

  // Get the first (default) docker image
  const defaultImage = Object.values(dockerImages)[0]

  await prisma.server.update({
    where: { id: server.id },
    data: { image: defaultImage },
  })

  // TODO: Activity log: server:startup.image.reverted

  return c.body(null, 204)
}

export async function changeEgg(c: AppContext) {
  const server = c.var.server!
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

    // TODO: Activity log: server:settings.egg
  }

  return c.body(null, 204)
}

export async function previewEggChange(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const { egg_id, nest_id } = await c.req.json()

  const egg = await prisma.egg.findUnique({
    where: { id: egg_id },
    include: { variables: true },
  })

  if (!egg) {
    throw new AppError('The specified egg does not exist.', 404, 'NotFound')
  }

  // TODO: Activity log: server:settings.egg-preview

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
  const {
    egg_id,
    nest_id,
    docker_image,
    startup_command,
    environment,
    should_backup,
    should_wipe,
  } = await c.req.json()

  // In production, this dispatches an async operation through ServerOperationService.
  const operationId = `op_${Date.now()}`

  // TODO: Activity log: server:software.change-queued

  return c.json({
    operation_id: operationId,
    status: 'queued',
  }, 202)
}

export async function getServerOperations(c: AppContext) {
  const server = c.var.server!

  // In production, fetch from ServerOperationService
  return c.json({ operations: [] })
}

export async function getOperationStatus(c: AppContext) {
  const server = c.var.server!
  const operationId = c.req.param('operationId')

  // In production, fetch from ServerOperationService
  return c.json({
    operation_id: operationId,
    status: 'unknown',
    server_id: server.id,
  })
}
