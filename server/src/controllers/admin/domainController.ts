import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem, fractalPaginated } from '../../utils/response'
import { paginationSchema, getPaginationOffset } from '../../utils/pagination'
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformDomain(domain: any) {
  return {
    id: Number(domain.id),
    name: domain.name,
    dns_provider: domain.dnsProvider,
    dns_config: domain.dnsConfig,
    is_active: domain.isActive,
    is_default: domain.isDefault,
    subdomain_count: domain._count?.serverSubdomains ?? 0,
    created_at: domain.createdAt?.toISOString(),
    updated_at: domain.updatedAt?.toISOString(),
  }
}

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const pagination = paginationSchema.parse({
    page: c.req.query('page'),
    per_page: c.req.query('per_page'),
  })
  const { skip, take } = getPaginationOffset(pagination)

  const [domains, total] = await Promise.all([
    prisma.domain.findMany({
      include: { _count: { select: { serverSubdomains: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.domain.count(),
  ])

  return c.json(fractalPaginated('domain', domains.map(transformDomain), total, pagination.page, pagination.per_page))
}

export async function view(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)

  const domain = await prisma.domain.findUnique({
    where: { id: BigInt(id) },
    include: { _count: { select: { serverSubdomains: true } } },
  })
  if (!domain) throw new NotFoundError('Domain not found')

  return c.json(fractalItem('domain', transformDomain(domain)))
}

export async function store(c: AppContext) {
  const prisma = c.var.prisma
  const body = await c.req.json()

  if (body.is_default) {
    await prisma.domain.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    })
  }

  const domain = await prisma.domain.create({
    data: {
      name: body.name,
      dnsProvider: body.dns_provider || 'cloudflare',
      dnsConfig: body.dns_config || {},
      isActive: body.is_active ?? true,
      isDefault: body.is_default ?? false,
    },
    include: { _count: { select: { serverSubdomains: true } } },
  })

  return c.json(fractalItem('domain', transformDomain(domain)), 201)
}

export async function update(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.json()

  const existing = await prisma.domain.findUnique({ where: { id: BigInt(id) } })
  if (!existing) throw new NotFoundError('Domain not found')

  if (body.is_default === true) {
    await prisma.domain.updateMany({
      where: { isDefault: true, id: { not: BigInt(id) } },
      data: { isDefault: false },
    })
  }

  if (body.is_default === false && existing.isDefault) {
    const otherDefaults = await prisma.domain.count({
      where: { isDefault: true, id: { not: BigInt(id) } },
    })
    if (otherDefaults === 0) {
      throw new ValidationError('Cannot remove default status when this is the only default domain.')
    }
  }

  const data: any = {}
  if (body.name !== undefined) data.name = body.name
  if (body.dns_provider !== undefined) data.dnsProvider = body.dns_provider
  if (body.dns_config !== undefined) data.dnsConfig = body.dns_config
  if (body.is_active !== undefined) data.isActive = body.is_active
  if (body.is_default !== undefined) data.isDefault = body.is_default

  const domain = await prisma.domain.update({
    where: { id: BigInt(id) },
    data,
    include: { _count: { select: { serverSubdomains: true } } },
  })

  return c.json(fractalItem('domain', transformDomain(domain)))
}

export async function deleteDomain(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)

  const domain = await prisma.domain.findUnique({
    where: { id: BigInt(id) },
    include: { _count: { select: { serverSubdomains: true } } },
  })
  if (!domain) throw new NotFoundError('Domain not found')

  if (domain._count.serverSubdomains > 0) {
    throw new ConflictError('Cannot delete a domain with active subdomains.')
  }

  if (domain.isDefault) {
    const otherDefaults = await prisma.domain.count({
      where: { isDefault: true, id: { not: BigInt(id) } },
    })
    if (otherDefaults === 0) {
      throw new ConflictError('Cannot delete the only default domain.')
    }
  }

  await prisma.domain.delete({ where: { id: BigInt(id) } })
  return c.body(null, 204)
}

export async function testConnection(c: AppContext) {
  const body = await c.req.json()
  const provider = body.dns_provider
  const config = body.dns_config || {}

  try {
    switch (provider) {
      case 'cloudflare': {
        const response = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
          headers: { Authorization: `Bearer ${config.api_token}` },
        })
        const data = await response.json() as any
        if (!data.success) {
          return c.json({ success: false, error: 'Invalid Cloudflare API token' })
        }
        return c.json({ success: true, message: 'Cloudflare connection successful' })
      }

      case 'hetzner': {
        const response = await fetch('https://dns.hetzner.com/api/v1/zones', {
          headers: { 'Auth-API-Token': config.api_token },
        })
        if (!response.ok) {
          return c.json({ success: false, error: 'Invalid Hetzner DNS API token' })
        }
        return c.json({ success: true, message: 'Hetzner DNS connection successful' })
      }

      case 'route53': {
        return c.json({ success: false, error: 'Route53 connection test not yet implemented' })
      }

      default:
        return c.json({ success: false, error: `Unknown DNS provider: ${provider}` })
    }
  } catch (error: any) {
    return c.json({ success: false, error: error.message || 'Connection failed' })
  }
}

export async function providerSchema(c: AppContext) {
  const provider = c.req.param('provider')

  const schemas: Record<string, object> = {
    cloudflare: {
      fields: [
        { key: 'api_token', label: 'API Token', type: 'password', required: true },
        { key: 'zone_id', label: 'Zone ID', type: 'text', required: true },
      ],
    },
    hetzner: {
      fields: [
        { key: 'api_token', label: 'API Token', type: 'password', required: true },
        { key: 'zone_id', label: 'Zone ID', type: 'text', required: true },
      ],
    },
    route53: {
      fields: [
        { key: 'access_key', label: 'Access Key ID', type: 'text', required: true },
        { key: 'secret_key', label: 'Secret Access Key', type: 'password', required: true },
        { key: 'hosted_zone_id', label: 'Hosted Zone ID', type: 'text', required: true },
        { key: 'region', label: 'Region', type: 'text', required: true },
      ],
    },
  }

  return c.json(schemas[provider] || { fields: [] })
}
