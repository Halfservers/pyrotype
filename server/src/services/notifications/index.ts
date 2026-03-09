import type { PrismaClient } from '@/generated/prisma'

export async function createNotification(
  prisma: PrismaClient,
  userId: number,
  type: string,
  data: Record<string, unknown>,
): Promise<void> {
  await prisma.notification.create({
    data: {
      id: crypto.randomUUID(),
      type,
      notifiableType: 'user',
      notifiableId: BigInt(userId),
      data: data as any,
    },
  })
}
