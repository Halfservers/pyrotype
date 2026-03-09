import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { fractalList, fractalItem } from '../../../../utils/response'
import { NotFoundError, AppError } from '../../../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformVariable(variable: any, serverValue: string | null) {
  return {
    name: variable.name,
    description: variable.description,
    env_variable: variable.envVariable,
    default_value: variable.defaultValue,
    server_value: serverValue,
    is_editable: variable.userEditable,
    rules: variable.rules,
  }
}

function buildStartupCommand(server: any, variables: any[]): string {
  let command = server.startup
  for (const v of variables) {
    const value = v.serverValue ?? v.variable?.defaultValue ?? ''
    command = command.replace(new RegExp(`\\{\\{${v.variable?.envVariable}\\}\\}`, 'g'), value)
  }
  return command
}

async function resolveServer(c: AppContext): Promise<any> {
  const serverId = c.req.param('server')
  const prisma = c.var.prisma
  const server = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    include: {
      egg: true,
      serverVariables: { include: { variable: true } },
    },
  })
  if (!server) throw new NotFoundError('Server not found')
  return server
}

export async function index(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma

  const eggVariables = await prisma.eggVariable.findMany({
    where: { eggId: server.eggId, userViewable: true },
  })

  const serverVarMap = new Map<number, string>(
    server.serverVariables.map((sv: any) => [sv.variableId, sv.variableValue]),
  )

  const data = eggVariables.map((v) => transformVariable(v, serverVarMap.get(v.id) ?? null))
  const startupCommand = buildStartupCommand(server, server.serverVariables)

  const result = fractalList('egg_variable', data)
  return c.json({
    ...result,
    meta: {
      startup_command: startupCommand,
      docker_images: server.egg?.dockerImages ?? {},
      raw_startup_command: server.startup,
    },
  })
}

export async function update(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma
  const body = await c.req.json()
  const key = body.key as string
  const value = (body.value as string) ?? ''

  const eggVar = await prisma.eggVariable.findFirst({
    where: { eggId: server.eggId, envVariable: key },
  })

  if (!eggVar || !eggVar.userViewable) {
    throw new AppError('The environment variable you are trying to edit does not exist.', 400, 'BadRequest')
  }

  if (!eggVar.userEditable) {
    throw new AppError('The environment variable you are trying to edit is read-only.', 400, 'BadRequest')
  }

  const existingVar = await prisma.serverVariable.findFirst({
    where: { serverId: server.id, variableId: eggVar.id },
  })

  if (existingVar) {
    await prisma.serverVariable.update({
      where: { id: existingVar.id },
      data: { variableValue: value },
    })
  } else {
    await prisma.serverVariable.create({
      data: {
        serverId: server.id,
        variableId: eggVar.id,
        variableValue: value,
      },
    })
  }

  // Re-fetch for updated startup command
  const updatedServer = await resolveServer(c)
  const startupCommand = buildStartupCommand(updatedServer, updatedServer.serverVariables)

  return c.json({
    ...fractalItem('egg_variable', transformVariable(eggVar, value)),
    meta: {
      startup_command: startupCommand,
      raw_startup_command: updatedServer!.startup,
    },
  })
}

export async function updateCommand(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma
  const body = await c.req.json()
  const startup = body.startup as string

  await prisma.server.update({
    where: { id: server.id },
    data: { startup },
  })

  const updatedServer: any = await resolveServer(c)

  const eggVariables = await prisma.eggVariable.findMany({
    where: { eggId: updatedServer.eggId, userViewable: true },
  })

  const serverVarMap = new Map<number, string>(
    updatedServer.serverVariables.map((sv: any) => [sv.variableId, sv.variableValue]),
  )

  const data = eggVariables.map((v) => transformVariable(v, serverVarMap.get(v.id) ?? null))
  const startupCommand = buildStartupCommand(updatedServer, updatedServer.serverVariables)

  const result = fractalList('egg_variable', data)
  return c.json({
    ...result,
    meta: {
      startup_command: startupCommand,
      docker_images: updatedServer.egg?.dockerImages ?? {},
      raw_startup_command: updatedServer.startup,
    },
  })
}

export async function getDefaultCommand(c: AppContext) {
  const server = await resolveServer(c)
  return c.json({ default_startup_command: server.egg?.startup ?? '' })
}

export async function processCommand(c: AppContext) {
  const server = await resolveServer(c)
  const body = await c.req.json()
  const command = (body.command as string) ?? server.startup

  // Replace variables in the provided command
  let processed = command
  for (const sv of server.serverVariables) {
    const envVar = sv.variable?.envVariable
    if (envVar) {
      const value = sv.variableValue || sv.variable?.defaultValue || ''
      processed = processed.replace(new RegExp(`\\{\\{${envVar}\\}\\}`, 'g'), value)
    }
  }

  return c.json({ processed_command: processed })
}
