import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { ForbiddenError, AppError } from '../../../../utils/errors'
import { createDnsRecord, deleteDnsRecord } from '../../../../services/subdomains'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function listSubdomains(c: AppContext) {
  const server = c.var.server!
  const permissions = c.var.serverPermissions ?? []
  const user = c.var.user!
  const prisma = c.var.prisma

  if (!user.rootAdmin && !permissions.includes('allocation.read')) {
    throw new ForbiddenError('Missing permission: allocation.read')
  }

  // Check if server supports subdomains
  const subdomains = await prisma.serverSubdomain.findMany({
    where: { serverId: server.id, isActive: true },
    include: { domain: true },
  })

  const availableDomains = await prisma.domain.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  })

  const currentSubdomain = subdomains[0] ?? null

  return c.json({
    supported: true,
    current_subdomain: currentSubdomain
      ? {
          object: 'server_subdomain',
          attributes: {
            subdomain: currentSubdomain.subdomain,
            domain: currentSubdomain.domain.name,
            domain_id: currentSubdomain.domainId,
            full_domain: `${currentSubdomain.subdomain}.${currentSubdomain.domain.name}`,
            is_active: currentSubdomain.isActive,
          },
        }
      : null,
    available_domains: availableDomains,
  })
}

export async function createSubdomain(c: AppContext) {
  const server = c.var.server!
  const permissions = c.var.serverPermissions ?? []
  const user = c.var.user!
  const prisma = c.var.prisma

  if (!user.rootAdmin && !permissions.includes('allocation.create')) {
    throw new ForbiddenError('Missing permission: allocation.create')
  }

  const { subdomain, domain_id } = await c.req.json()

  if (!subdomain || !domain_id) {
    throw new AppError('Subdomain and domain_id are required.', 422, 'ValidationError')
  }

  const domain = await prisma.domain.findFirst({
    where: { id: domain_id, isActive: true },
  })

  if (!domain) {
    return c.json({ error: 'Selected domain is not available.' }, 422)
  }

  // Delete any existing active subdomains for this server
  const existing = await prisma.serverSubdomain.findMany({
    where: { serverId: server.id, isActive: true },
  })

  if (existing.length > 0) {
    await prisma.serverSubdomain.updateMany({
      where: { serverId: server.id, isActive: true },
      data: { isActive: false },
    })
  }

  // Get server's allocation IP for DNS record
  const allocation = await prisma.allocation.findFirst({
    where: { serverId: server.id },
  })
  const serverIp = allocation?.ip ?? ''

  // Create DNS record
  const dnsResult = await createDnsRecord(domain, subdomain.toLowerCase(), serverIp)

  // Create the new subdomain record
  const newSubdomain = await prisma.serverSubdomain.create({
    data: {
      serverId: server.id,
      domainId: domain_id,
      subdomain: subdomain.toLowerCase(),
      recordType: 'A',
      dnsRecords: dnsResult.recordId ? { recordId: dnsResult.recordId } : {},
      isActive: true,
    },
    include: { domain: true },
  })

  // If DNS creation failed, clean up the DB record and throw
  if (!dnsResult.success && serverIp) {
    await prisma.serverSubdomain.delete({ where: { id: newSubdomain.id } })
    throw new AppError(`DNS record creation failed: ${dnsResult.error}`, 500, 'DnsError')
  }

  return c.json({
    message: existing.length > 0 ? 'Subdomain replaced successfully.' : 'Subdomain created successfully.',
    subdomain: {
      object: 'server_subdomain',
      attributes: {
        subdomain: newSubdomain.subdomain,
        domain: newSubdomain.domain.name,
        domain_id: newSubdomain.domainId,
        full_domain: `${newSubdomain.subdomain}.${newSubdomain.domain.name}`,
        is_active: newSubdomain.isActive,
      },
    },
  }, 201)
}

export async function destroySubdomain(c: AppContext) {
  const server = c.var.server!
  const permissions = c.var.serverPermissions ?? []
  const user = c.var.user!
  const prisma = c.var.prisma

  if (!user.rootAdmin && !permissions.includes('allocation.delete')) {
    throw new ForbiddenError('Missing permission: allocation.delete')
  }

  const subdomains = await prisma.serverSubdomain.findMany({
    where: { serverId: server.id, isActive: true },
    include: { domain: true },
  })

  if (subdomains.length === 0) {
    return c.json({ error: 'Server does not have any active subdomains.' }, 404)
  }

  // Delete DNS records for each active subdomain
  for (const sub of subdomains) {
    const records = (sub.dnsRecords as any) ?? {}
    if (records.recordId) {
      await deleteDnsRecord(sub.domain, records.recordId)
    }
  }

  await prisma.serverSubdomain.updateMany({
    where: { serverId: server.id, isActive: true },
    data: { isActive: false },
  })

  return c.json({ message: 'Subdomain(s) deleted successfully.' })
}

export async function checkAvailability(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const { subdomain, domain_id } = await c.req.json()

  if (!subdomain || !domain_id) {
    throw new AppError('Subdomain and domain_id are required.', 422, 'ValidationError')
  }

  // Validate subdomain format
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain) || subdomain.length > 63) {
    return c.json({ available: false, message: 'Invalid subdomain format.' })
  }

  const domain = await prisma.domain.findFirst({
    where: { id: domain_id, isActive: true },
  })

  if (!domain) {
    return c.json({ error: 'Selected domain is not available.' }, 422)
  }

  const existing = await prisma.serverSubdomain.findFirst({
    where: {
      domainId: domain_id,
      subdomain: subdomain.toLowerCase(),
      isActive: true,
    },
  })

  return c.json({
    available: !existing,
    message: existing ? 'This subdomain is already taken.' : 'This subdomain is available.',
  })
}
