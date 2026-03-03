import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { z } from 'zod'
import { NotFoundError, AppError } from '../../../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

const renameSchema = z.object({
  name: z.string().min(1).max(191),
  description: z.string().optional(),
})

const dockerImageSchema = z.object({
  docker_image: z.string().min(1),
})

const changeEggSchema = z.object({
  egg_id: z.number().int().positive(),
  nest_id: z.number().int().positive(),
})

const applyEggChangeSchema = z.object({
  egg_id: z.number().int().positive(),
  nest_id: z.number().int().positive(),
  docker_image: z.string().optional(),
  startup_command: z.string().optional(),
  environment: z.record(z.string(), z.string()).optional().default({}),
  should_backup: z.boolean().optional().default(false),
  should_wipe: z.boolean().optional().default(false),
})

async function resolveServer(c: AppContext): Promise<any> {
  const serverId = c.req.param('server')
  const prisma = c.var.prisma
  const server = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    include: { egg: true, node: true },
  })
  if (!server) throw new NotFoundError('Server not found')
  return server
}

export async function rename(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma
  const body = renameSchema.parse(await c.req.json())

  await prisma.server.update({
    where: { id: server.id },
    data: {
      name: body.name,
      description: body.description ?? server.description,
    },
  })

  return c.body(null, 204)
}

export async function reinstall(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma

  await prisma.server.update({
    where: { id: server.id },
    data: { status: 'installing', installedAt: null },
  })

  // TODO: Dispatch reinstall to Wings daemon

  return c.json([], 202)
}

export async function dockerImage(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma
  const body = dockerImageSchema.parse(await c.req.json())

  const allowedImages = Object.values(server.egg?.dockerImages as Record<string, string> ?? {})
  if (!allowedImages.includes(body.docker_image)) {
    throw new AppError('The requested Docker image is not allowed for this server.', 400, 'BadRequest')
  }

  await prisma.server.update({
    where: { id: server.id },
    data: { image: body.docker_image },
  })

  return c.body(null, 204)
}

export async function changeEgg(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma
  const body = changeEggSchema.parse(await c.req.json())

  if (server.eggId !== body.egg_id || server.nestId !== body.nest_id) {
    const egg = await prisma.egg.findUnique({ where: { id: body.egg_id } })
    if (!egg) throw new NotFoundError('Egg not found')

    await prisma.server.update({
      where: { id: server.id },
      data: {
        eggId: body.egg_id,
        nestId: body.nest_id,
        startup: egg.startup ?? server.startup,
      },
    })
  }

  return c.body(null, 204)
}

export async function previewEggChange(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma
  const body = changeEggSchema.parse(await c.req.json())

  const egg: any = await prisma.egg.findUnique({
    where: { id: body.egg_id },
    include: { variables: true },
  })

  if (!egg) throw new NotFoundError('Egg not found')

  return c.json({
    current_egg: {
      id: server.eggId,
      name: server.egg?.name ?? '',
    },
    new_egg: {
      id: egg.id,
      name: egg.name,
      docker_images: egg.dockerImages,
      startup: egg.startup,
      variables: egg.variables.map((v: any) => ({
        name: v.name,
        env_variable: v.envVariable,
        default_value: v.defaultValue,
        user_viewable: v.userViewable,
        user_editable: v.userEditable,
        rules: v.rules,
      })),
    },
  })
}

export async function applyEggChange(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma
  const user = c.var.user!
  const body = applyEggChangeSchema.parse(await c.req.json())

  const operationId = crypto.randomUUID()

  await prisma.serverOperation.create({
    data: {
      operationId,
      serverId: server.id,
      userId: user.id,
      type: 'egg_change',
      status: 'pending',
      parameters: JSON.parse(JSON.stringify({
        egg_id: body.egg_id,
        nest_id: body.nest_id,
        docker_image: body.docker_image,
        startup_command: body.startup_command,
        environment: body.environment,
        should_backup: body.should_backup,
        should_wipe: body.should_wipe,
      })),
    },
  })

  // TODO: Dispatch async egg change job

  return c.json({
    operation_id: operationId,
    status: 'pending',
    message: 'Egg change has been queued.',
  }, 202)
}
