import type { PrismaClient } from '../../generated/prisma'
import { logger } from '../../config/logger'

// ── Types ──────────────────────────────────────────────────────────────────

export interface MailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

interface MailSettings {
  host: string
  port: number
  encryption: string
  username: string
  password: string
  fromAddress: string
  fromName: string
}

// ── Settings ───────────────────────────────────────────────────────────────

async function getMailSettings(prisma: PrismaClient): Promise<MailSettings> {
  const settings = await prisma.setting.findMany({
    where: { key: { startsWith: 'mail:' } },
  })
  const map = new Map(settings.map((s) => [s.key, s.value]))

  return {
    host: map.get('mail:mailers:smtp:host') || '',
    port: parseInt(map.get('mail:mailers:smtp:port') || '587', 10),
    encryption: map.get('mail:mailers:smtp:encryption') || 'tls',
    username: map.get('mail:mailers:smtp:username') || '',
    password: map.get('mail:mailers:smtp:password') || '',
    fromAddress: map.get('mail:from:address') || 'noreply@example.com',
    fromName: map.get('mail:from:name') || 'Panel',
  }
}

async function getAppUrl(prisma: PrismaClient): Promise<string> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'app:url' },
  })
  return setting?.value || 'http://localhost'
}

// ── Core send ──────────────────────────────────────────────────────────────

/**
 * Send an email via MailChannels (free on Cloudflare Workers).
 * Falls back to logging when the API is unreachable.
 */
export async function sendMail(
  prisma: PrismaClient,
  options: MailOptions,
): Promise<boolean> {
  const settings = await getMailSettings(prisma)

  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: settings.fromAddress, name: settings.fromName },
        subject: options.subject,
        content: [
          { type: 'text/html', value: options.html },
          ...(options.text
            ? [{ type: 'text/plain', value: options.text }]
            : []),
        ],
      }),
    })

    if (response.ok || response.status === 202) {
      logger.info('Mail sent successfully', { to: options.to, subject: options.subject })
      return true
    }

    const body = await response.text()
    logger.error('MailChannels API error', {
      status: String(response.status),
      body,
      to: options.to,
    })
    return false
  } catch (error) {
    logger.error('Failed to send mail', {
      error: error instanceof Error ? error.message : String(error),
      to: options.to,
    })
    return false
  }
}

// ── Password reset ─────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  prisma: PrismaClient,
  email: string,
  token: string,
): Promise<boolean> {
  const appUrl = await getAppUrl(prisma)
  const resetUrl = `${appUrl}/auth/password/reset/${token}?email=${encodeURIComponent(email)}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2>Reset Password</h2>
  <p>You are receiving this email because we received a password reset request for your account.</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="${resetUrl}"
       style="background-color: #2563eb; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
      Reset Password
    </a>
  </p>
  <p>This password reset link will expire in 60 minutes.</p>
  <p>If you did not request a password reset, no further action is required.</p>
</body>
</html>`

  const text = [
    'Reset Password',
    '',
    'You are receiving this email because we received a password reset request for your account.',
    '',
    `Reset your password: ${resetUrl}`,
    '',
    'This password reset link will expire in 60 minutes.',
    'If you did not request a password reset, no further action is required.',
  ].join('\n')

  return sendMail(prisma, {
    to: email,
    subject: 'Reset Password Notification',
    html,
    text,
  })
}

// ── Account created ────────────────────────────────────────────────────────

export async function sendAccountCreatedEmail(
  prisma: PrismaClient,
  user: { email: string; nameFirst: string },
  token?: string,
): Promise<boolean> {
  const appUrl = await getAppUrl(prisma)

  let actionBlock = ''
  let actionText = ''
  if (token) {
    const setupUrl = `${appUrl}/auth/password/reset/${token}?email=${encodeURIComponent(user.email)}`
    actionBlock = `
  <p style="text-align: center; margin: 30px 0;">
    <a href="${setupUrl}"
       style="background-color: #2563eb; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
      Setup Your Account
    </a>
  </p>`
    actionText = `\nSetup your account: ${setupUrl}\n`
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2>Welcome!</h2>
  <p>Hello ${escapeHtml(user.nameFirst)},</p>
  <p>An account has been created for you on the panel.</p>
  ${actionBlock}
  <p>If you did not expect this email, you can safely ignore it.</p>
</body>
</html>`

  const text = [
    'Welcome!',
    '',
    `Hello ${user.nameFirst},`,
    'An account has been created for you on the panel.',
    actionText,
    'If you did not expect this email, you can safely ignore it.',
  ].join('\n')

  return sendMail(prisma, {
    to: user.email,
    subject: 'Account Created',
    html,
    text,
  })
}

// ── Server installed ───────────────────────────────────────────────────────

export async function sendServerInstalledEmail(
  prisma: PrismaClient,
  userEmail: string,
  serverName: string,
): Promise<boolean> {
  const settings = await getMailSettings(prisma)
  if (!settings.host) return false

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2>Server Installed</h2>
  <p>Your server <strong>${escapeHtml(serverName)}</strong> has finished installing and is now ready to use.</p>
  <p>If you did not expect this email, you can safely ignore it.</p>
</body>
</html>`

  const text = [
    'Server Installed',
    '',
    `Your server "${serverName}" has finished installing and is now ready to use.`,
    '',
    'If you did not expect this email, you can safely ignore it.',
  ].join('\n')

  return sendMail(prisma, {
    to: userEmail,
    subject: `Server Installed: ${serverName}`,
    html,
    text,
  })
}

// ── Added to server ────────────────────────────────────────────────────────

export async function sendAddedToServerEmail(
  prisma: PrismaClient,
  userEmail: string,
  serverName: string,
): Promise<boolean> {
  const settings = await getMailSettings(prisma)
  if (!settings.host) return false

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2>Added to Server</h2>
  <p>You have been added as a subuser to the server <strong>${escapeHtml(serverName)}</strong>.</p>
  <p>If you did not expect this email, you can safely ignore it.</p>
</body>
</html>`

  const text = [
    'Added to Server',
    '',
    `You have been added as a subuser to the server "${serverName}".`,
    '',
    'If you did not expect this email, you can safely ignore it.',
  ].join('\n')

  return sendMail(prisma, {
    to: userEmail,
    subject: `Added to Server: ${serverName}`,
    html,
    text,
  })
}

// ── Removed from server ────────────────────────────────────────────────────

export async function sendRemovedFromServerEmail(
  prisma: PrismaClient,
  userEmail: string,
  serverName: string,
): Promise<boolean> {
  const settings = await getMailSettings(prisma)
  if (!settings.host) return false

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2>Removed from Server</h2>
  <p>You have been removed from the server <strong>${escapeHtml(serverName)}</strong>.</p>
  <p>If you did not expect this email, you can safely ignore it.</p>
</body>
</html>`

  const text = [
    'Removed from Server',
    '',
    `You have been removed from the server "${serverName}".`,
    '',
    'If you did not expect this email, you can safely ignore it.',
  ].join('\n')

  return sendMail(prisma, {
    to: userEmail,
    subject: `Removed from Server: ${serverName}`,
    html,
    text,
  })
}

// ── Test email ─────────────────────────────────────────────────────────────

export async function sendTestMail(
  prisma: PrismaClient,
  toEmail: string,
): Promise<boolean> {
  return sendMail(prisma, {
    to: toEmail,
    subject: 'Test Message',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2>Test Email</h2>
  <p>This is a test email to confirm your mail configuration is working correctly.</p>
</body>
</html>`,
    text: 'This is a test email to confirm your mail configuration is working correctly.',
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
