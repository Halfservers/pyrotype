import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { generateToken } from '../../utils/crypto'
import { logger } from '../../config/logger'
import { sendPasswordResetEmail } from '../../services/mail/mailer'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function sendResetLink(c: AppContext) {
  const { email } = await c.req.json()
  const prisma = c.var.prisma

  // Always return success to prevent email enumeration
  if (!email) {
    return c.json({ status: 'We have e-mailed your password reset link!' })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (user) {
    const token = generateToken(32)

    // Delete existing reset tokens for this email
    await prisma.passwordReset.deleteMany({ where: { email } })

    // Create new reset token
    await prisma.passwordReset.create({
      data: {
        email,
        token,
        createdAt: new Date(),
      },
    })

    // Send the reset email (non-blocking: don't fail the request if mail fails)
    const sent = await sendPasswordResetEmail(prisma, email, token)
    if (!sent) {
      logger.warn(`Failed to send password reset email to ${email}`)
    }
  }

  // Always return success to avoid revealing whether the email exists
  return c.json({ status: 'We have e-mailed your password reset link!' })
}
