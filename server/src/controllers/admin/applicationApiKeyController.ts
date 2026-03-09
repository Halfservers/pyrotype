import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { NotFoundError } from '../../utils/errors'
import { fractalList } from '../../utils/response'
import { generateApiKeyIdentifier, generateApiKeyToken } from '../../services/auth/apiKey'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const keys = await prisma.apiKey.findMany({
    where: { keyType: 0 },
    orderBy: { createdAt: 'desc' },
  })
  return c.json(fractalList('api_key', keys.map(k => ({
    id: k.id,
    identifier: k.identifier,
    description: k.memo,
    allowed_ips: k.allowedIps,
    last_used_at: k.lastUsedAt?.toISOString() ?? null,
    created_at: k.createdAt.toISOString(),
  }))))
}

export async function store(c: AppContext) {
  const prisma = c.var.prisma
  const { description, allowed_ips } = await c.req.json()
  const identifier = generateApiKeyIdentifier()
  const { plain, hashed } = await generateApiKeyToken()

  const user = c.var.user!

  const apiKey = await prisma.apiKey.create({
    data: {
      userId: user.id,
      keyType: 0,
      identifier,
      token: hashed,
      memo: description ?? '',
      allowedIps: allowed_ips ? JSON.stringify(allowed_ips) : '[]',
    },
  })

  return c.json({
    object: 'api_key',
    attributes: {
      id: apiKey.id,
      identifier,
      token: `${identifier}.${plain}`,
      description: apiKey.memo,
      allowed_ips: apiKey.allowedIps,
      created_at: apiKey.createdAt.toISOString(),
    },
    meta: {
      secret_token: `${identifier}.${plain}`,
    },
  }, 201)
}

export async function destroy(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const key = await prisma.apiKey.findFirst({ where: { id, keyType: 0 } })
  if (!key) throw new NotFoundError('API key not found')
  await prisma.apiKey.delete({ where: { id } })
  return c.body(null, 204)
}
