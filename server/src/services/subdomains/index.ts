import { logger } from '../../config/logger'

interface DnsConfig {
  api_token?: string
  zone_id?: string
}

interface DomainLike {
  name: string
  dnsProvider: string
  dnsConfig: DnsConfig | any
}

export async function createDnsRecord(
  domain: DomainLike,
  subdomain: string,
  serverIp: string,
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  const config = (typeof domain.dnsConfig === 'string'
    ? JSON.parse(domain.dnsConfig)
    : domain.dnsConfig) as DnsConfig

  switch (domain.dnsProvider) {
    case 'cloudflare':
      return createCloudflareDnsRecord(config, domain.name, subdomain, serverIp)
    case 'hetzner':
      return createHetznerDnsRecord(config, subdomain, serverIp)
    case 'route53':
      logger.warn('Route53 DNS management not yet implemented')
      return { success: false, error: 'Route53 not implemented' }
    default:
      logger.warn(`Unknown DNS provider: ${domain.dnsProvider}`)
      return { success: false, error: `Unknown DNS provider: ${domain.dnsProvider}` }
  }
}

export async function deleteDnsRecord(
  domain: DomainLike,
  recordId?: string,
): Promise<boolean> {
  if (!recordId) return true

  const config = (typeof domain.dnsConfig === 'string'
    ? JSON.parse(domain.dnsConfig)
    : domain.dnsConfig) as DnsConfig

  switch (domain.dnsProvider) {
    case 'cloudflare':
      return deleteCloudflareDnsRecord(config, recordId)
    case 'hetzner':
      return deleteHetznerDnsRecord(config, recordId)
    case 'route53':
      logger.warn('Route53 DNS deletion not yet implemented')
      return false
    default:
      return false
  }
}

async function createCloudflareDnsRecord(
  config: DnsConfig,
  domainName: string,
  subdomain: string,
  ip: string,
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  if (!config.api_token || !config.zone_id) {
    return { success: false, error: 'Missing Cloudflare API token or zone ID' }
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${config.zone_id}/dns_records`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.api_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'A',
          name: `${subdomain}.${domainName}`,
          content: ip,
          ttl: 1,
          proxied: false,
        }),
      },
    )

    const data = (await res.json()) as any
    if (!data.success) {
      const errMsg = data.errors?.[0]?.message ?? 'Unknown Cloudflare error'
      return { success: false, error: errMsg }
    }

    return { success: true, recordId: data.result?.id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Cloudflare API request failed',
    }
  }
}

async function deleteCloudflareDnsRecord(config: DnsConfig, recordId: string): Promise<boolean> {
  if (!config.api_token || !config.zone_id) return false

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${config.zone_id}/dns_records/${recordId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${config.api_token}` },
      },
    )
    return res.ok
  } catch {
    return false
  }
}

async function createHetznerDnsRecord(
  config: DnsConfig,
  subdomain: string,
  ip: string,
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  if (!config.api_token || !config.zone_id) {
    return { success: false, error: 'Missing Hetzner API token or zone ID' }
  }

  try {
    const res = await fetch('https://dns.hetzner.com/api/v1/records', {
      method: 'POST',
      headers: {
        'Auth-API-Token': config.api_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        zone_id: config.zone_id,
        type: 'A',
        name: subdomain,
        value: ip,
        ttl: 300,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return { success: false, error: `Hetzner DNS error: ${text}` }
    }

    const data = (await res.json()) as any
    return { success: true, recordId: data.record?.id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Hetzner DNS API request failed',
    }
  }
}

async function deleteHetznerDnsRecord(config: DnsConfig, recordId: string): Promise<boolean> {
  if (!config.api_token) return false

  try {
    const res = await fetch(`https://dns.hetzner.com/api/v1/records/${recordId}`, {
      method: 'DELETE',
      headers: { 'Auth-API-Token': config.api_token },
    })
    return res.ok
  } catch {
    return false
  }
}
