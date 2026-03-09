import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { NotFoundError, AppError } from '../../utils/errors'
import { daemonRequest, DaemonConnectionError } from '../../services/daemon/proxy'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function transferFailure(c: AppContext) {
  const prisma = c.var.prisma
  const uuid = c.req.param('uuid')

  const server = await prisma.server.findFirst({
    where: { uuid },
    include: { transfers: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })

  if (!server) {
    throw new NotFoundError('Server not found.')
  }

  const transfer = server.transfers[0]
  if (!transfer) {
    throw new AppError('Server is not being transferred.', 409, 'Conflict')
  }

  // Mark the transfer as failed and release reserved allocations
  await prisma.$transaction(async (tx) => {
    await tx.serverTransfer.update({
      where: { id: transfer.id },
      data: { successful: false },
    })

    // Release new allocations that were reserved for the transfer
    const allocationsToRelease = [
      transfer.newAllocation,
      ...(transfer.newAdditionalAllocations as number[] ?? []),
    ]

    if (allocationsToRelease.length > 0) {
      await tx.allocation.updateMany({
        where: { id: { in: allocationsToRelease } },
        data: { serverId: null },
      })
    }
  })

  return c.body(null, 204)
}

export async function transferSuccess(c: AppContext) {
  const prisma = c.var.prisma
  const uuid = c.req.param('uuid')

  const server = await prisma.server.findFirst({
    where: { uuid },
    include: { transfers: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })

  if (!server) {
    throw new NotFoundError('Server not found.')
  }

  const transfer = server.transfers[0]
  if (!transfer) {
    throw new AppError('Server is not being transferred.', 409, 'Conflict')
  }

  // Retrieve the old node before we update the server record so we can clean up
  const oldNode = await prisma.node.findUnique({ where: { id: transfer.oldNode } })

  await prisma.$transaction(async (tx) => {
    // Release old allocations so they can be re-used
    const oldAllocations = [
      transfer.oldAllocation,
      ...(transfer.oldAdditionalAllocations as number[] ?? []),
    ]

    if (oldAllocations.length > 0) {
      await tx.allocation.updateMany({
        where: { id: { in: oldAllocations } },
        data: { serverId: null },
      })
    }

    // Redirect the server record to the new node and primary allocation
    await tx.server.update({
      where: { id: server.id },
      data: {
        allocationId: transfer.newAllocation,
        nodeId: transfer.newNode,
      },
    })

    // Archive the transfer as successful
    await tx.serverTransfer.update({
      where: { id: transfer.id },
      data: { successful: true },
    })
  })

  // Attempt to delete the server data from the old daemon.  Failure here is
  // non-fatal — the server has already been moved and we log a warning rather
  // than returning an error to the calling daemon.
  if (oldNode) {
    try {
      await daemonRequest(oldNode, 'DELETE', `/api/servers/${uuid}`)
    } catch (err) {
      // DaemonConnectionError is expected when the old node is unreachable.
      // Any other error is still non-fatal for the transfer itself.
      if (!(err instanceof DaemonConnectionError)) {
        console.warn(
          `[transfer] Failed to delete server ${uuid} from old node ${oldNode.id}:`,
          err,
        )
      }
    }
  }

  return c.body(null, 204)
}
