import { Hono } from 'hono'
import type { Env, HonoVariables } from '../types/env'
import { login, logout } from '../controllers/auth/loginController'
import { handle as loginCheckpoint } from '../controllers/auth/loginCheckpointController'
import { sendResetLink } from '../controllers/auth/forgotPasswordController'
import { handle as resetPassword } from '../controllers/auth/resetPasswordController'
import { rateLimit } from '../middleware/rateLimiter'
import { verifyCaptchaMiddleware } from '../middleware/captcha'

type AppType = { Bindings: Env; Variables: HonoVariables }

export const authApp = new Hono<AppType>()

// Public captcha config (provider + site key only, never secret)
authApp.get('/captcha', async (c) => {
  const prisma = c.var.prisma
  const settings = await prisma.setting.findMany({
    where: { key: { startsWith: 'pterodactyl:captcha:' } },
  })
  const map = new Map(settings.map((s: { key: string; value: string }) => [s.key, s.value]))
  const provider = map.get('pterodactyl:captcha:provider') ?? 'none'
  if (provider === 'none') {
    return c.json({ enabled: false, provider: 'none', siteKey: '' })
  }
  const siteKeyMap: Record<string, string> = {
    turnstile: 'pterodactyl:captcha:turnstile:site_key',
    hcaptcha: 'pterodactyl:captcha:hcaptcha:site_key',
    recaptcha: 'pterodactyl:captcha:recaptcha:site_key',
  }
  const siteKey = map.get(siteKeyMap[provider] ?? '') ?? ''
  return c.json({ enabled: true, provider, siteKey })
})

// Rate-limit login attempts: 5 per minute, verify captcha before login
authApp.post('/login', rateLimit(5, 1), verifyCaptchaMiddleware, login)
authApp.post('/login/checkpoint', rateLimit(5, 1), loginCheckpoint)

authApp.post('/password', rateLimit(3, 1), sendResetLink)
authApp.post('/password/reset', rateLimit(3, 1), resetPassword)

authApp.post('/logout', logout)
