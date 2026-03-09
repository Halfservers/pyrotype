import { AppError } from '../../utils/errors'

interface DaemonNode {
  fqdn: string
  internalFqdn?: string | null
  scheme: string
  daemonListen: number
  daemonTokenId: string
  daemonToken: string
  useSeparateFqdns?: boolean
}

interface DaemonRequestOptions {
  timeout?: number
  rawResponse?: boolean
  contentType?: string
}

export class DaemonConnectionError extends AppError {
  constructor(message = 'Unable to connect to the daemon.') {
    super(message, 502, 'DaemonConnectionError')
  }
}

function buildDaemonUrl(node: DaemonNode): string {
  const host = node.useSeparateFqdns && node.internalFqdn
    ? node.internalFqdn
    : node.fqdn
  return `${node.scheme}://${host}:${node.daemonListen}`
}

export function getDaemonBaseUrl(node: DaemonNode): string {
  return buildDaemonUrl(node)
}

export function getDaemonWsUrl(node: DaemonNode, serverUuid: string): string {
  const protocol = node.scheme === 'https' ? 'wss' : 'ws'
  const host = node.fqdn
  return `${protocol}://${host}:${node.daemonListen}/api/servers/${serverUuid}/ws`
}

export async function daemonRequest<T = unknown>(
  node: DaemonNode,
  method: string,
  path: string,
  body?: unknown,
  options?: DaemonRequestOptions,
): Promise<T> {
  const baseUrl = buildDaemonUrl(node)
  const url = `${baseUrl}${path}`
  const timeout = options?.timeout ?? 30000

  const headers: Record<string, string> = {
    Authorization: `Bearer ${node.daemonToken}`,
    Accept: 'application/json',
  }

  const init: RequestInit = { method, headers }

  if (body !== undefined) {
    if (typeof body === 'string') {
      headers['Content-Type'] = options?.contentType ?? 'text/plain'
      init.body = body
    } else {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
  }

  init.signal = AbortSignal.timeout(timeout)

  let res: Response
  try {
    res = await fetch(url, init)
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new DaemonConnectionError('Request to the daemon timed out.')
    }
    throw new DaemonConnectionError()
  }

  if (!res.ok) {
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new DaemonConnectionError()
    }
    const text = await res.text().catch(() => '')
    throw new AppError(
      `Daemon returned error ${res.status}: ${text}`,
      res.status >= 500 ? 502 : res.status,
      'DaemonError',
    )
  }

  if (options?.rawResponse) {
    return res as unknown as T
  }

  if (res.status === 204) return undefined as T

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>
  }
  return res.text() as unknown as T
}
