import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { sendTestMail } from '../../services/mail/mailer'
import { AppError } from '../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const settings = await prisma.setting.findMany()
  return c.json({
    object: 'list',
    data: settings.map(s => ({
      object: 'setting',
      attributes: { key: s.key, value: s.value },
    })),
  })
}

export async function update(c: AppContext) {
  const prisma = c.var.prisma
  const body = await c.req.json()
  const updates = Object.entries(body) as [string, string][]

  for (const [key, value] of updates) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })
  }

  const settings = await prisma.setting.findMany()
  return c.json({
    object: 'list',
    data: settings.map(s => ({
      object: 'setting',
      attributes: { key: s.key, value: s.value },
    })),
  })
}

export async function testMail(c: AppContext) {
  const prisma = c.var.prisma
  const user = c.var.user

  if (!user) {
    throw new AppError('Authentication required', 401, 'AuthenticationError')
  }

  const success = await sendTestMail(prisma, user.email)

  if (!success) {
    throw new AppError('Failed to send test email. Check mail configuration.', 500, 'MailError')
  }

  return c.json({ success: true })
}
