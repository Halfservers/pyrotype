import { createMiddleware } from 'hono/factory'
import type { Env, HonoVariables } from '../types/env'
import { verifyCaptcha } from '../services/captcha/verify'
import { ValidationError } from '../utils/errors'

type AppContext = { Bindings: Env; Variables: HonoVariables }

/** Map of captcha provider names to their request body field names. */
const CAPTCHA_FIELD_MAP: Record<string, string> = {
  turnstile: 'cf-turnstile-response',
  hcaptcha: 'h-captcha-response',
  recaptcha: 'g-recaptcha-response',
}

/** Map of captcha provider names to their settings key for the secret. */
const SECRET_KEY_MAP: Record<string, string> = {
  turnstile: 'pterodactyl:captcha:turnstile:secret_key',
  hcaptcha: 'pterodactyl:captcha:hcaptcha:secret_key',
  recaptcha: 'pterodactyl:captcha:recaptcha:secret_key',
}

/**
 * Hono middleware that verifies captcha responses based on the configured
 * provider in the database settings table.
 *
 * If the provider is 'none' or not set, the middleware passes through.
 * Otherwise it extracts the captcha token from the request body, looks up the
 * secret key from settings, and calls the provider verification API.
 */
export const verifyCaptchaMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const prisma = c.var.prisma

  const settings = await prisma.setting.findMany({
    where: {
      key: {
        startsWith: 'pterodactyl:captcha:',
      },
    },
  })

  const settingsMap = new Map(settings.map((s: { key: string; value: string }) => [s.key, s.value]))

  const provider = settingsMap.get('pterodactyl:captcha:provider') ?? 'none'

  if (provider === 'none') {
    await next()
    return
  }

  const fieldName = CAPTCHA_FIELD_MAP[provider]
  if (!fieldName) {
    await next()
    return
  }

  let body: Record<string, unknown> = {}
  try {
    body = await c.req.json()
  } catch {
    throw new ValidationError('Invalid request body.')
  }

  const responseToken = String(body[fieldName] ?? '')

  const secretKeySettingKey = SECRET_KEY_MAP[provider]
  const secretKey = secretKeySettingKey ? (settingsMap.get(secretKeySettingKey) ?? '') : ''

  if (!secretKey) {
    throw new ValidationError('Captcha is configured but no secret key is set.')
  }

  const remoteIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || undefined

  const result = await verifyCaptcha(provider, secretKey, responseToken, remoteIp)

  if (!result.success) {
    throw new ValidationError('Captcha verification failed. Please try again.')
  }

  await next()
})
