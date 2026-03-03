import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { AppError } from '../../../../utils/errors'
import { fractalList } from '../../../../utils/response'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function getStartup(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma

  // Load server variables that are user-viewable
  const variables = await prisma.serverVariable.findMany({
    where: { serverId: server.id },
    include: { variable: true },
  })

  const viewable = variables.filter(v => v.variable?.userViewable)

  const egg = await prisma.egg.findUnique({ where: { id: server.eggId } })

  return c.json({
    ...fractalList('egg_variable', viewable),
    meta: {
      startup_command: server.startup,
      docker_images: egg?.dockerImages ?? {},
      raw_startup_command: server.startup,
    },
  })
}

export async function updateVariable(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const { key, value } = await c.req.json()

  if (!key) {
    throw new AppError('A variable key must be provided.', 422, 'ValidationError')
  }

  // Find the variable by env_variable name
  const serverVar = await prisma.serverVariable.findFirst({
    where: { serverId: server.id },
    include: {
      variable: {
        select: {
          id: true,
          envVariable: true,
          userViewable: true,
          userEditable: true,
          rules: true,
        },
      },
    },
  })

  if (!serverVar?.variable?.userViewable) {
    throw new AppError('The environment variable you are trying to edit does not exist.', 400, 'BadRequest')
  }

  if (!serverVar.variable.userEditable) {
    throw new AppError('The environment variable you are trying to edit is read-only.', 400, 'BadRequest')
  }

  await prisma.serverVariable.upsert({
    where: { id: serverVar.id },
    update: { variableValue: value ?? '' },
    create: {
      serverId: server.id,
      variableId: serverVar.variable.id,
      variableValue: value ?? '',
    },
  })

  // TODO: Activity log: server:startup.edit

  const egg = await prisma.egg.findUnique({ where: { id: server.eggId } })

  return c.json({
    object: 'egg_variable',
    attributes: serverVar,
    meta: {
      startup_command: server.startup,
      raw_startup_command: server.startup,
    },
  })
}

export async function updateCommand(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const { startup } = await c.req.json()

  if (!startup || typeof startup !== 'string') {
    throw new AppError('A startup command must be provided.', 422, 'ValidationError')
  }

  await prisma.server.update({
    where: { id: server.id },
    data: { startup },
  })

  const variables = await prisma.serverVariable.findMany({
    where: { serverId: server.id },
    include: { variable: true },
  })

  const viewable = variables.filter(v => v.variable?.userViewable)
  const egg = await prisma.egg.findUnique({ where: { id: server.eggId } })

  return c.json({
    ...fractalList('egg_variable', viewable),
    meta: {
      startup_command: startup,
      docker_images: egg?.dockerImages ?? {},
      raw_startup_command: startup,
    },
  })
}

export async function getDefaultCommand(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const egg = await prisma.egg.findUnique({ where: { id: server.eggId } })

  return c.json({
    default_startup_command: egg?.startup ?? '',
  })
}

export async function processCommand(c: AppContext) {
  const server = c.var.server!
  const body = await c.req.json()
  const command = (body.command as string) ?? server.startup

  // In production, process command by substituting variable values.
  // For now, return the raw command as the "processed" version.
  return c.json({
    processed_command: command,
  })
}
