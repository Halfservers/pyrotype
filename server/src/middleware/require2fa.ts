import { createMiddleware } from 'hono/factory'
import type { Env, HonoVariables } from '../types/env'

type AppContext = { Bindings: Env; Variables: HonoVariables }

/**
 * Hono middleware that enforces two-factor authentication based on the
 * `pterodactyl:auth:2fa_required` setting in the database.
 *
 * Levels:
 *   0 - 2FA not required (pass through)
 *   1 - 2FA required for admin users only
 *   2 - 2FA required for all users
 *
 * If the user already has TOTP enabled (`useTotp`), they pass through.
 * Otherwise a 403 JSON error is returned instructing them to enable 2FA.
 */
export const require2fa = createMiddleware<AppContext>(async (c, next) => {
  const prisma = c.var.prisma

  const setting = await prisma.setting.findUnique({
    where: { key: 'pterodactyl:auth:2fa_required' },
  })

  const level = setting ? parseInt(setting.value, 10) : 0

  if (level === 0) {
    await next()
    return
  }

  const user = c.var.user

  if (!user) {
    await next()
    return
  }

  if (user.useTotp) {
    await next()
    return
  }

  if (level === 1 && !user.rootAdmin) {
    await next()
    return
  }

  // Level is 1 and user is admin without 2FA, or level is 2 and user lacks 2FA
  return c.json(
    {
      errors: [
        {
          code: 'TwoFactorRequired',
          status: '403',
          detail: 'Two-factor authentication must be enabled on your account.',
        },
      ],
    },
    403,
  )
})
