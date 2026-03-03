// TODO: Replace with fetch-based email provider (e.g., Mailgun, Resend, SendGrid)
// nodemailer is not compatible with Cloudflare Workers

export async function sendPasswordResetEmail(
  _email: string,
  _token: string,
  _appUrl?: string,
  _mailFrom?: string,
): Promise<void> {
  // In production, use a fetch-based email service:
  // const response = await fetch('https://api.resend.com/emails', {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ from, to: email, subject, html }),
  // })
  console.warn('Email sending not yet configured for Workers runtime')
}
