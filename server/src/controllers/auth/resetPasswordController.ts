import type { Context } from 'hono'
import { setCookie } from 'hono/cookie'
import type { Env, HonoVariables } from '../../types/env'
import { hashPassword } from '../../utils/crypto'
import { createSession } from '../../services/auth/session'
import { AppError } from '../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function handle(c: AppContext) {
  const { email, token, password, passwordConfirmation } = await c.req.json()
  const prisma = c.var.prisma

  if (!email || !token || !password) {
    throw new AppError('Missing required fields.', 422, 'ValidationError')
  }

  if (password !== passwordConfirmation) {
    throw new AppError('The password confirmation does not match.', 422, 'ValidationError')
  }

  if (password.length < 8) {
    throw new AppError('The password must be at least 8 characters.', 422, 'ValidationError')
  }

  const resetRecord = await prisma.passwordReset.findFirst({
    where: { email, token },
  })

  if (!resetRecord) {
    throw new AppError('This password reset token is invalid.', 422, 'ValidationError')
  }

  // Check if token is expired (1 hour)
  if (resetRecord.createdAt && Date.now() - resetRecord.createdAt.getTime() > 60 * 60 * 1000) {
    await prisma.passwordReset.deleteMany({ where: { email } })
    throw new AppError('This password reset token is invalid.', 422, 'ValidationError')
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new AppError('This password reset token is invalid.', 422, 'ValidationError')
  }

  const hashed = await hashPassword(password)

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  })

  // Delete all reset tokens for this email
  await prisma.passwordReset.deleteMany({ where: { email } })

  // If user has 2FA, force them to log in again
  const sendToLogin = user.useTotp

  if (!sendToLogin) {
    const signedCookie = await createSession(c.env.SESSION_KV, c.env.APP_KEY, {
      userId: user.id,
      twoFactorVerified: true,
    })
    setCookie(c, 'pyrotype_session', signedCookie, {
      httpOnly: true,
      secure: c.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
  }

  return c.json({
    success: true,
    redirect_to: '/',
    send_to_login: sendToLogin,
  })
}
