import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors'
import { daemonRequest, DaemonConnectionError, getDaemonBaseUrl } from '../../services/daemon/proxy'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function suspend(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const server = await prisma.server.findUnique({ where: { id } })
  if (!server) throw new NotFoundError('Server not found')

  await prisma.server.update({
    where: { id },
    data: { status: 'suspended' },
  })

  const updated = await prisma.server.findUnique({
    where: { id },
    include: { node: true },
  })

  if (updated?.node) {
    try {
      await daemonRequest(updated.node, 'POST', `/api/servers/${updated.uuid}/suspend`)
    } catch (err) {
      if (!(err instanceof DaemonConnectionError)) throw err
    }
  }

  return c.body(null, 204)
}

export async function unsuspend(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const server = await prisma.server.findUnique({ where: { id } })
  if (!server) throw new NotFoundError('Server not found')

  await prisma.server.update({
    where: { id },
    data: { status: null },
  })

  const updated = await prisma.server.findUnique({
    where: { id },
    include: { node: true },
  })

  if (updated?.node) {
    try {
      await daemonRequest(updated.node, 'POST', `/api/servers/${updated.uuid}/unsuspend`)
    } catch (err) {
      if (!(err instanceof DaemonConnectionError)) throw err
    }
  }

  return c.body(null, 204)
}

export async function reinstall(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const server = await prisma.server.findUnique({
    where: { id },
    include: { node: true },
  })
  if (!server) throw new NotFoundError('Server not found')

  await prisma.server.update({
    where: { id },
    data: { status: 'installing', installedAt: null },
  })

  if (server.node) {
    try {
      await daemonRequest(server.node, 'POST', `/api/servers/${server.uuid}/install`)
    } catch (err) {
      if (!(err instanceof DaemonConnectionError)) throw err
    }
  }

  return c.body(null, 204)
}

export async function toggleInstall(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)

  const server = await prisma.server.findUnique({ where: { id } })
  if (!server) throw new NotFoundError('Server not found')

  if (server.status === 'install_failed') {
    throw new ConflictError('Cannot toggle install status for a server that failed installation.')
  }

  await prisma.server.update({
    where: { id },
    data: {
      installedAt: server.installedAt ? null : new Date(),
      status: server.installedAt ? 'installing' : null,
    },
  })

  return c.body(null, 204)
}

/**
 * Generate a transfer token for a target node using Web Crypto HMAC-SHA256.
 *
 * Wings/Elytra expects the token in the form:
 *   base64url(header).base64url(payload).base64url(signature)
 *
 * The signature is computed over the concatenated header and payload using the
 * target node's daemon token as the HMAC-SHA256 key.  This mirrors what
 * Pyrodactyl's NodeJWTService produces with Lcobucci/JWT.
 */
async function generateTransferToken(
  targetNodeToken: string,
  serverUuid: string,
  uniqueId: string,
  nowSeconds: number,
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    // Standard JWT claims
    iss: 'pyrotype',
    aud: 'elytra',
    iat: nowSeconds,
    nbf: nowSeconds - 300, // allow 5 minutes of clock skew
    exp: nowSeconds + 900,  // 15-minute expiry
    sub: serverUuid,
    // Custom claims
    server_uuid: serverUuid,
    unique_id: uniqueId,
  }

  const encodeB64Url = (obj: unknown): string => {
    const json = JSON.stringify(obj)
    const b64 = btoa(unescape(encodeURIComponent(json)))
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  const encodedHeader = encodeB64Url(header)
  const encodedPayload = encodeB64Url(payload)
  const signingInput = `${encodedHeader}.${encodedPayload}`

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(targetNodeToken),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput))
  const signatureBytes = new Uint8Array(signatureBuffer)
  const signatureB64 = btoa(String.fromCharCode(...signatureBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `${signingInput}.${signatureB64}`
}

export async function transfer(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)

  const body = await c.req.json<{
    node_id: number
    allocation_id: number
    allocation_additional?: number[]
  }>()

  const { node_id, allocation_id, allocation_additional } = body

  if (!node_id || !allocation_id) {
    throw new ValidationError('node_id and allocation_id are required.')
  }

  // Load server with its current node
  const server = await prisma.server.findUnique({
    where: { id },
    include: { node: true },
  })
  if (!server) throw new NotFoundError('Server not found.')

  // Cannot transfer a suspended server
  if (server.status === 'suspended') {
    throw new ConflictError('Cannot transfer a suspended server.')
  }

  // Cannot transfer while an existing transfer is already in progress
  const existingTransfer = await prisma.serverTransfer.findFirst({
    where: { serverId: server.id, successful: null },
  })
  if (existingTransfer) {
    throw new ConflictError('A transfer is already in progress for this server.')
  }

  // Validate target node
  const targetNode = await prisma.node.findUnique({ where: { id: node_id } })
  if (!targetNode) throw new NotFoundError('Target node not found.')

  if (targetNode.id === server.nodeId) {
    throw new ValidationError('Cannot transfer a server to the same node.')
  }

  // Check target node has enough available memory and disk (respecting overallocate %)
  const usedResources = await prisma.server.aggregate({
    where: { nodeId: targetNode.id },
    _sum: { memory: true, disk: true },
  })

  const usedMemory = usedResources._sum.memory ?? 0
  const usedDisk = usedResources._sum.disk ?? 0
  const availableMemory = targetNode.memory * (1 + targetNode.memoryOverallocate / 100)
  const availableDisk = targetNode.disk * (1 + targetNode.diskOverallocate / 100)

  if (usedMemory + server.memory > availableMemory) {
    throw new ValidationError('Target node does not have enough memory to accept this server.')
  }
  if (usedDisk + server.disk > availableDisk) {
    throw new ValidationError('Target node does not have enough disk space to accept this server.')
  }

  // Validate that the primary allocation belongs to the target node and is unassigned
  const primaryAllocation = await prisma.allocation.findFirst({
    where: { id: allocation_id, nodeId: targetNode.id, serverId: null },
  })
  if (!primaryAllocation) {
    throw new ValidationError(
      'The specified allocation does not exist on the target node or is already assigned to a server.',
    )
  }

  // Validate additional allocations if provided
  const additionalAllocations: number[] = []
  if (allocation_additional && allocation_additional.length > 0) {
    for (const allocId of allocation_additional) {
      const alloc = await prisma.allocation.findFirst({
        where: { id: allocId, nodeId: targetNode.id, serverId: null },
      })
      if (!alloc) {
        throw new ValidationError(
          `Additional allocation ${allocId} does not exist on the target node or is already assigned.`,
        )
      }
      additionalAllocations.push(allocId)
    }
  }

  // Gather the server's current additional allocations (all allocations except the primary)
  const currentAllocations = await prisma.allocation.findMany({
    where: { serverId: server.id, id: { not: server.allocationId } },
    select: { id: true },
  })
  const oldAdditionalAllocations = currentAllocations.map((a) => a.id)

  // Create the transfer record and reserve the target allocations atomically
  const serverTransfer = await prisma.$transaction(async (tx) => {
    const created = await tx.serverTransfer.create({
      data: {
        serverId: server.id,
        oldNode: server.nodeId,
        newNode: targetNode.id,
        oldAllocation: server.allocationId,
        newAllocation: allocation_id,
        oldAdditionalAllocations,
        newAdditionalAllocations: additionalAllocations,
      },
    })

    // Reserve all target allocations so they cannot be auto-assigned during the transfer
    const allNewAllocations = [allocation_id, ...additionalAllocations]
    await tx.allocation.updateMany({
      where: { id: { in: allNewAllocations }, nodeId: targetNode.id, serverId: null },
      data: { serverId: server.id },
    })

    return created
  })

  // Generate a unique transfer ID for the JWT
  const uniqueId = crypto.randomUUID()
  const nowSeconds = Math.floor(Date.now() / 1000)

  // Build a signed JWT that Wings/Elytra on the target node will validate
  const transferToken = await generateTransferToken(
    targetNode.daemonToken,
    server.uuid,
    uniqueId,
    nowSeconds,
  )

  // Notify the source daemon to begin the outgoing transfer.
  // On failure we roll back by unassigning the reserved allocations and deleting the record.
  try {
    await daemonRequest(server.node!, 'POST', '/api/transfer', {
      server_id: server.uuid,
      url: `${getDaemonBaseUrl(targetNode)}/api/transfers`,
      token: `Bearer ${transferToken}`,
      server: {
        uuid: server.uuid,
        start_on_completion: false,
      },
    })
  } catch (err) {
    // Roll back reserved allocations and the transfer record
    await prisma.$transaction(async (tx) => {
      const allNewAllocations = [allocation_id, ...additionalAllocations]
      await tx.allocation.updateMany({
        where: { id: { in: allNewAllocations } },
        data: { serverId: null },
      })
      await tx.serverTransfer.delete({ where: { id: serverTransfer.id } })
    })

    if (err instanceof DaemonConnectionError) {
      throw new ConflictError(
        'Unable to contact the source daemon to initiate the transfer. The transfer has been cancelled.',
      )
    }
    throw err
  }

  return c.json({ transfer_id: serverTransfer.id }, 202)
}
