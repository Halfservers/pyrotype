import type { PrismaClient } from '@/generated/prisma'
import { SYSTEM_PERMISSIONS } from '../constants/permissions'

interface ServerLike {
  id: number
  ownerId: number
}

interface UserLike {
  id: number
  rootAdmin: boolean
}

export async function getUserPermissions(prisma: PrismaClient, server: ServerLike, user: UserLike): Promise<string[]> {
  if (user.rootAdmin || user.id === server.ownerId) {
    return getAllPermissions()
  }

  const subuser = await prisma.subuser.findUnique({
    where: {
      userId_serverId: {
        userId: user.id,
        serverId: server.id,
      },
    },
  })

  if (!subuser) {
    return []
  }

  const permissions = subuser.permissions as string[]
  return Array.isArray(permissions) ? permissions : []
}

function getAllPermissions(): string[] {
  const all: string[] = []
  for (const [prefix, group] of Object.entries(SYSTEM_PERMISSIONS)) {
    for (const key of Object.keys(group.keys)) {
      all.push(`${prefix}.${key}`)
    }
  }
  return all
}
