import type { Context } from 'hono'
import { setCookie } from 'hono/cookie'
import type { Env, HonoVariables } from '../../types/env'
import { verifyPassword } from '../../utils/crypto'
import { verifyTotpCode } from '../../services/auth/twoFactor'
import { createSession, destroySession } from '../../services/auth/session'
import { getCookie } from 'hono/cookie'
import { AppError } from '../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformUserForResponse(user: {
  id: number
  uuid: string
  username: string
  email: string
  language: string
  rootAdmin: boolean
  useTotp: boolean
  nameFirst: string | null
  nameLast: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    object: 'user',
    attributes: {
      id: user.id,
      uuid: user.uuid,
      username: user.username,
      email: user.email,
      language: user.language.trim(),
      root_admin: user.rootAdmin,
      use_totp: user.useTotp,
      name_first: user.nameFirst,
      name_last: user.nameLast,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    },
  }
}

export async function handle(c: AppContext) {
  const { confirmation_token, authentication_code, recovery_token } = await c.req.json()
  const prisma = c.var.prisma

  const details = c.var.session?.authConfirmationToken
  if (!details || !details.userId || !details.tokenValue || !details.expiresAt) {
    throw new AppError(
      'The authentication token provided has expired, please refresh the page and try again.',
      422,
      'AuthenticationError',
    )
  }

  if (Date.now() > details.expiresAt) {
    throw new AppError(
      'The authentication token provided has expired, please refresh the page and try again.',
      422,
      'AuthenticationError',
    )
  }

  if (!confirmation_token || confirmation_token !== details.tokenValue) {
    throw new AppError('These credentials do not match our records.', 422, 'AuthenticationError')
  }

  const user = await prisma.user.findUnique({
    where: { id: details.userId },
    include: { recoveryTokens: true },
  })

  if (!user) {
    throw new AppError(
      'The authentication token provided has expired, please refresh the page and try again.',
      422,
      'AuthenticationError',
    )
  }

  // Try recovery token first
  if (recovery_token) {
    let found = false
    for (const rt of user.recoveryTokens) {
      const valid = await verifyPassword(recovery_token, rt.token)
      if (valid) {
        await prisma.recoveryToken.delete({ where: { id: rt.id } })
        found = true
        break
      }
    }
    if (!found) {
      throw new AppError('The recovery token provided is not valid.', 422, 'AuthenticationError')
    }
  } else {
    // Verify TOTP code
    if (!authentication_code || !user.totpSecret) {
      throw new AppError('Two-factor authentication checkpoint failed.', 422, 'AuthenticationError')
    }

    const isValid = verifyTotpCode(user.totpSecret, authentication_code)
    if (!isValid) {
      throw new AppError('Two-factor authentication checkpoint failed.', 422, 'AuthenticationError')
    }
  }

  // Destroy the temporary 2FA session and create a fully authenticated one
  const oldCookie = getCookie(c, 'pyrotype_session')
  if (oldCookie) {
    await destroySession(c.env.SESSION_KV, c.env.APP_KEY, oldCookie)
  }

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

  return c.json({
    data: {
      complete: true,
      intended: '/',
      user: transformUserForResponse(user),
    },
  })
}
