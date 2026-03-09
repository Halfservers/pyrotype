import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem, fractalList } from '../../utils/response'
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

const RESERVED_ENV_VARIABLES = [
  'SERVER_MEMORY',
  'SERVER_IP',
  'SERVER_PORT',
  'SERVER_UUID',
  'SERVER_NAME',
  'SERVER_CPU',
  'STARTUP',
]

function transformEggVariable(variable: any) {
  return {
    id: variable.id,
    egg_id: variable.eggId,
    name: variable.name,
    description: variable.description,
    env_variable: variable.envVariable,
    default_value: variable.defaultValue,
    user_viewable: variable.userViewable,
    user_editable: variable.userEditable,
    rules: variable.rules,
    sort: variable.sort,
    created_at: variable.createdAt.toISOString(),
    updated_at: variable.updatedAt.toISOString(),
  }
}

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const nestId = parseInt(c.req.param('id'), 10)
  const eggId = parseInt(c.req.param('eggId'), 10)

  const egg = await prisma.egg.findFirst({
    where: { id: eggId, nestId },
  })
  if (!egg) throw new NotFoundError('Egg not found')

  const variables = await prisma.eggVariable.findMany({
    where: { eggId },
    orderBy: { sort: 'asc' },
  })

  return c.json(fractalList('egg_variable', variables.map(transformEggVariable)))
}

export async function store(c: AppContext) {
  const prisma = c.var.prisma
  const nestId = parseInt(c.req.param('id'), 10)
  const eggId = parseInt(c.req.param('eggId'), 10)

  const egg = await prisma.egg.findFirst({
    where: { id: eggId, nestId },
  })
  if (!egg) throw new NotFoundError('Egg not found')

  const body = await c.req.json()

  if (RESERVED_ENV_VARIABLES.includes(body.env_variable)) {
    throw new ValidationError(`The environment variable ${body.env_variable} is reserved and cannot be used.`)
  }

  const existing = await prisma.eggVariable.findFirst({
    where: { eggId, envVariable: body.env_variable },
  })
  if (existing) {
    throw new ConflictError(`An environment variable with the name ${body.env_variable} already exists for this egg.`)
  }

  const variable = await prisma.eggVariable.create({
    data: {
      eggId,
      name: body.name,
      description: body.description || '',
      envVariable: body.env_variable,
      defaultValue: body.default_value || '',
      userViewable: body.user_viewable ?? false,
      userEditable: body.user_editable ?? false,
      rules: body.rules || '',
    },
  })

  return c.json(fractalItem('egg_variable', transformEggVariable(variable)), 201)
}

export async function update(c: AppContext) {
  const prisma = c.var.prisma
  const nestId = parseInt(c.req.param('id'), 10)
  const eggId = parseInt(c.req.param('eggId'), 10)
  const variableId = parseInt(c.req.param('variableId'), 10)

  const egg = await prisma.egg.findFirst({
    where: { id: eggId, nestId },
  })
  if (!egg) throw new NotFoundError('Egg not found')

  const existing = await prisma.eggVariable.findFirst({
    where: { id: variableId, eggId },
  })
  if (!existing) throw new NotFoundError('Egg variable not found')

  const body = await c.req.json()
  const data: any = {}

  if (body.name !== undefined) data.name = body.name
  if (body.description !== undefined) data.description = body.description
  if (body.default_value !== undefined) data.defaultValue = body.default_value
  if (body.user_viewable !== undefined) data.userViewable = body.user_viewable
  if (body.user_editable !== undefined) data.userEditable = body.user_editable
  if (body.rules !== undefined) data.rules = body.rules

  if (body.env_variable !== undefined) {
    if (RESERVED_ENV_VARIABLES.includes(body.env_variable)) {
      throw new ValidationError(`The environment variable ${body.env_variable} is reserved and cannot be used.`)
    }

    if (body.env_variable !== existing.envVariable) {
      const duplicate = await prisma.eggVariable.findFirst({
        where: { eggId, envVariable: body.env_variable, id: { not: variableId } },
      })
      if (duplicate) {
        throw new ConflictError(`An environment variable with the name ${body.env_variable} already exists for this egg.`)
      }
    }

    data.envVariable = body.env_variable
  }

  const variable = await prisma.eggVariable.update({ where: { id: variableId }, data })
  return c.json(fractalItem('egg_variable', transformEggVariable(variable)))
}

export async function deleteVariable(c: AppContext) {
  const prisma = c.var.prisma
  const nestId = parseInt(c.req.param('id'), 10)
  const eggId = parseInt(c.req.param('eggId'), 10)
  const variableId = parseInt(c.req.param('variableId'), 10)

  const egg = await prisma.egg.findFirst({
    where: { id: eggId, nestId },
  })
  if (!egg) throw new NotFoundError('Egg not found')

  const existing = await prisma.eggVariable.findFirst({
    where: { id: variableId, eggId },
  })
  if (!existing) throw new NotFoundError('Egg variable not found')

  await prisma.eggVariable.delete({ where: { id: variableId } })
  return c.body(null, 204)
}
