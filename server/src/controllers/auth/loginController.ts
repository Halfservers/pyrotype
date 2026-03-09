import type { Context } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import type { Env, HonoVariables } from '../../types/env'
import { verifyPassword, generateToken } from '../../utils/crypto'
import { createSession, updateSession, destroySession } from '../../services/auth/session'
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

export async function login(c: AppContext) {
  const body = await c.req.json()
  const prisma = c.var.prisma

  const identifier = String(body?.user ?? '')
  const password = String(body?.password ?? '')

  if (!identifier || !password) {
    throw new AppError('The user and password fields are required.', 422, 'ValidationError')
  }

  const field = identifier.includes('@') ? 'email' : 'username'

  const user = await prisma.user.findFirst({
    where: { [field]: identifier },
  })

  if (!user) {
    throw new AppError('These credentials do not match our records.', 422, 'AuthenticationError')
  }

  const valid = await verifyPassword(password, user.password)
  if (!valid) {
    throw new AppError('These credentials do not match our records.', 422, 'AuthenticationError')
  }

  if (!user.useTotp) {
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

  // 2FA is enabled: store pending state in session
  const token = generateToken(32)

  // Create a temporary session to hold the 2FA confirmation token
  const signedCookie = await createSession(c.env.SESSION_KV, c.env.APP_KEY, {
    userId: 0, // not yet authenticated
    authConfirmationToken: {
      userId: user.id,
      tokenValue: token,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    },
  })
  setCookie(c, 'pyrotype_session', signedCookie, {
    httpOnly: true,
    secure: c.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 5 * 60, // 5 minutes for checkpoint
    path: '/',
  })

  return c.json({
    data: {
      complete: false,
      confirmation_token: token,
    },
  })
}

export async function logout(c: AppContext) {
  const cookie = getCookie(c, 'pyrotype_session')
  if (cookie) {
    await destroySession(c.env.SESSION_KV, c.env.APP_KEY, cookie)
  }
  deleteCookie(c, 'pyrotype_session')
  return c.body(null, 204)
}
