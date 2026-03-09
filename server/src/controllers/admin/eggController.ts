import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem, fractalList } from '../../utils/response'
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors'
import { generateUuid } from '../../utils/crypto'

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

export async function store(c: AppContext) {
  const prisma = c.var.prisma
  const nestId = parseInt(c.req.param('id'), 10)

  const nest = await prisma.nest.findUnique({ where: { id: nestId } })
  if (!nest) throw new NotFoundError('Nest not found')

  const body = await c.req.json()

  const egg = await prisma.egg.create({
    data: {
      uuid: generateUuid(),
      nestId,
      author: 'custom@local',
      name: body.name,
      description: body.description || null,
      dockerImages: body.docker_images || '{}',
      startup: body.startup || null,
      configFiles: body.config_files || null,
      configStartup: body.config_startup || null,
      configStop: body.config_stop || null,
      configLogs: body.config_logs || null,
      scriptInstall: body.script_install || null,
      scriptContainer: body.script_container || 'alpine:3.4',
      scriptEntry: body.script_entry || 'ash',
    },
  })

  return c.json(fractalItem('egg', transformEgg(egg)), 201)
}

export async function update(c: AppContext) {
  const prisma = c.var.prisma
  const nestId = parseInt(c.req.param('id'), 10)
  const eggId = parseInt(c.req.param('eggId'), 10)

  const existing = await prisma.egg.findFirst({
    where: { id: eggId, nestId },
  })
  if (!existing) throw new NotFoundError('Egg not found')

  const body = await c.req.json()
  const data: any = {}
  if (body.name !== undefined) data.name = body.name
  if (body.description !== undefined) data.description = body.description
  if (body.docker_images !== undefined) data.dockerImages = body.docker_images
  if (body.startup !== undefined) data.startup = body.startup
  if (body.config_files !== undefined) data.configFiles = body.config_files
  if (body.config_startup !== undefined) data.configStartup = body.config_startup
  if (body.config_stop !== undefined) data.configStop = body.config_stop
  if (body.config_logs !== undefined) data.configLogs = body.config_logs
  if (body.script_install !== undefined) data.scriptInstall = body.script_install
  if (body.script_container !== undefined) data.scriptContainer = body.script_container
  if (body.script_entry !== undefined) data.scriptEntry = body.script_entry

  const egg = await prisma.egg.update({ where: { id: eggId }, data })
  return c.json(fractalItem('egg', transformEgg(egg)))
}

export async function deleteEgg(c: AppContext) {
  const prisma = c.var.prisma
  const nestId = parseInt(c.req.param('id'), 10)
  const eggId = parseInt(c.req.param('eggId'), 10)

  const existing = await prisma.egg.findFirst({
    where: { id: eggId, nestId },
  })
  if (!existing) throw new NotFoundError('Egg not found')

  const serverCount = await prisma.server.count({ where: { eggId } })
  if (serverCount > 0) {
    throw new ConflictError('Cannot delete an egg with active servers.')
  }

  await prisma.egg.delete({ where: { id: eggId } })
  return c.body(null, 204)
}

export async function exportEgg(c: AppContext) {
  const prisma = c.var.prisma
  const nestId = parseInt(c.req.param('id'), 10)
  const eggId = parseInt(c.req.param('eggId'), 10)

  const egg = await prisma.egg.findFirst({
    where: { id: eggId, nestId },
    include: { variables: { orderBy: { sort: 'asc' } } },
  })
  if (!egg) throw new NotFoundError('Egg not found')

  let dockerImages: Record<string, string> = {}
  try {
    dockerImages = typeof egg.dockerImages === 'string'
      ? JSON.parse(egg.dockerImages)
      : (egg.dockerImages as Record<string, string>) ?? {}
  } catch {
    dockerImages = {}
  }

  const payload = {
    _comment: 'DO NOT EDIT: FILE GENERATED AUTOMATICALLY BY PYROTYPE PANEL',
    meta: { version: 'PTDL_v2', update_url: null },
    exported_at: new Date().toISOString(),
    name: egg.name,
    author: egg.author,
    description: egg.description ?? '',
    features: null,
    docker_images: dockerImages,
    file_denylist: [],
    startup: egg.startup ?? '',
    config: {
      files: egg.configFiles ?? '{}',
      startup: egg.configStartup ?? '{"done": ""}',
      stop: egg.configStop ?? '^C',
      logs: egg.configLogs ?? '{}',
    },
    scripts: {
      installation: {
        script: egg.scriptInstall ?? '',
        container: egg.scriptContainer ?? 'alpine:3.4',
        entrypoint: egg.scriptEntry ?? 'ash',
      },
    },
    variables: (egg.variables ?? []).map((v: any) => ({
      name: v.name,
      description: v.description ?? '',
      env_variable: v.envVariable,
      default_value: v.defaultValue ?? '',
      user_viewable: v.userViewable,
      user_editable: v.userEditable,
      rules: v.rules ?? '',
      sort: v.sort ?? 0,
      field_type: 'text',
    })),
  }

  const filename = `${egg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export async function importEgg(c: AppContext) {
  const prisma = c.var.prisma
  const nestId = parseInt(c.req.param('id'), 10)

  const nest = await prisma.nest.findUnique({ where: { id: nestId } })
  if (!nest) throw new NotFoundError('Nest not found')

  const body = await c.req.json()

  if (!body.name || typeof body.name !== 'string') {
    throw new ValidationError('Egg JSON must include a valid "name" field.')
  }
  if (body.startup !== undefined && typeof body.startup !== 'string') {
    throw new ValidationError('"startup" must be a string.')
  }

  const dockerImages = body.docker_images && typeof body.docker_images === 'object'
    ? JSON.stringify(body.docker_images)
    : '{}'

  const installation = body.scripts?.installation ?? {}
  const config = body.config ?? {}

  const egg = await prisma.$transaction(async (tx) => {
    const created = await tx.egg.create({
      data: {
        uuid: generateUuid(),
        nestId,
        author: body.author ?? 'imported@local',
        name: body.name,
        description: body.description ?? null,
        dockerImages,
        startup: body.startup ?? null,
        configFiles: config.files ?? null,
        configStartup: config.startup ?? null,
        configStop: config.stop ?? null,
        configLogs: config.logs ?? null,
        scriptInstall: installation.script ?? null,
        scriptContainer: installation.container ?? 'alpine:3.4',
        scriptEntry: installation.entrypoint ?? 'ash',
      },
    })

    const variables: any[] = Array.isArray(body.variables) ? body.variables : []
    for (let i = 0; i < variables.length; i++) {
      const v = variables[i]
      if (!v.env_variable || typeof v.env_variable !== 'string') continue
      await tx.eggVariable.create({
        data: {
          eggId: created.id,
          name: v.name ?? v.env_variable,
          description: v.description ?? '',
          envVariable: v.env_variable,
          defaultValue: v.default_value ?? '',
          userViewable: v.user_viewable ?? true,
          userEditable: v.user_editable ?? true,
          rules: v.rules ?? '',
          sort: v.sort ?? i,
        },
      })
    }

    return created
  })

  return c.json(fractalItem('egg', transformEgg(egg)), 201)
}
