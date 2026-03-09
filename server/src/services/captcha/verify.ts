export interface CaptchaResult {
  success: boolean
}

/**
 * Verifies a captcha response token against the appropriate provider API.
 *
 * @param provider  - The captcha provider: 'turnstile', 'hcaptcha', 'recaptcha', or 'none'.
 * @param secretKey - The server-side secret key for the captcha provider.
 * @param responseToken - The captcha response token submitted by the client.
 * @param remoteIp - Optional IP address of the client.
 * @returns An object with a `success` boolean indicating whether verification passed.
 */
export async function verifyCaptcha(
  provider: string,
  secretKey: string,
  responseToken: string,
  remoteIp?: string,
): Promise<CaptchaResult> {
  if (provider === 'none') {
    return { success: true }
  }

  if (!responseToken) {
    return { success: false }
  }

  switch (provider) {
    case 'turnstile':
      return verifyTurnstile(secretKey, responseToken, remoteIp)
    case 'hcaptcha':
      return verifyHCaptcha(secretKey, responseToken, remoteIp)
    case 'recaptcha':
      return verifyReCaptcha(secretKey, responseToken)
    default:
      return { success: false }
  }
}

async function verifyTurnstile(
  secret: string,
  response: string,
  remoteip?: string,
): Promise<CaptchaResult> {
  const body: Record<string, string> = { secret, response }
  if (remoteip) {
    body.remoteip = remoteip
  }

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = (await res.json()) as { success: boolean }
  return { success: data.success === true }
}

async function verifyHCaptcha(
  secret: string,
  response: string,
  remoteip?: string,
): Promise<CaptchaResult> {
  const params = new URLSearchParams({ secret, response })
  if (remoteip) {
    params.set('remoteip', remoteip)
  }

  const res = await fetch('https://api.hcaptcha.com/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const data = (await res.json()) as { success: boolean }
  return { success: data.success === true }
}

async function verifyReCaptcha(secret: string, response: string): Promise<CaptchaResult> {
  const params = new URLSearchParams({ secret, response })

  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const data = (await res.json()) as { success: boolean }
  return { success: data.success === true }
}
