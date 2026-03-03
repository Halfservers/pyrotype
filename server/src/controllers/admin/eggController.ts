import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem, fractalList } from '../../utils/response'
import { NotFoundError } from '../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformEgg(egg: any) {
  return {
    id: egg.id,
    uuid: egg.uuid,
    name: egg.name,
    nest: egg.nestId,
    author: egg.author,
    description: egg.description,
    docker_image: egg.dockerImages,
    docker_images: egg.dockerImages,
    config: {
      files: egg.configFiles,
      startup: egg.configStartup,
      stop: egg.configStop,
      logs: egg.configLogs,
      extends: egg.configFrom,
    },
    startup: egg.startup,
    script: {
      privileged: egg.scriptIsPrivileged,
      install: egg.scriptInstall,
      entry: egg.scriptEntry,
      container: egg.scriptContainer,
      extends: egg.copyScriptFrom,
    },
    created_at: egg.createdAt.toISOString(),
    updated_at: egg.updatedAt.toISOString(),
  }
}

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const nestId = parseInt(c.req.param('id'), 10)
  const nest = await prisma.nest.findUnique({ where: { id: nestId } })
  if (!nest) throw new NotFoundError('Nest not found')

  const eggs = await prisma.egg.findMany({
    where: { nestId },
    orderBy: { id: 'asc' },
  })

  return c.json(fractalList('egg', eggs.map(transformEgg)))
}

export async function view(c: AppContext) {
  const prisma = c.var.prisma
  const nestId = parseInt(c.req.param('id'), 10)
  const eggId = parseInt(c.req.param('eggId'), 10)

  const egg = await prisma.egg.findFirst({
    where: { id: eggId, nestId },
  })
  if (!egg) throw new NotFoundError('Egg not found')

  return c.json(fractalItem('egg', transformEgg(egg)))
}
