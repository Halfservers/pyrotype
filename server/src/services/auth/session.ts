import type { SessionData } from '../../types/env'
import { hmacSign, hmacVerify } from '../../utils/crypto'

const SESSION_TTL = 7 * 24 * 60 * 60 // 7 days in seconds

export async function createSession(
  kv: KVNamespace,
  appKey: string,
  data: SessionData,
): Promise<string> {
  const sessionId = crypto.randomUUID()
  await kv.put(`session:${sessionId}`, JSON.stringify(data), {
    expirationTtl: SESSION_TTL,
  })
  return signCookie(sessionId, appKey)
}

export async function loadSession(
  kv: KVNamespace,
  appKey: string,
  cookie: string,
): Promise<{ sessionId: string; data: SessionData } | null> {
  const sessionId = await verifyCookie(cookie, appKey)
  if (!sessionId) return null

  const raw = await kv.get(`session:${sessionId}`)
  if (!raw) return null

  try {
    return { sessionId, data: JSON.parse(raw) as SessionData }
  } catch {
    return null
  }
}

export async function updateSession(
  kv: KVNamespace,
  sessionId: string,
  data: SessionData,
): Promise<void> {
  await kv.put(`session:${sessionId}`, JSON.stringify(data), {
    expirationTtl: SESSION_TTL,
  })
}

export async function destroySession(
  kv: KVNamespace,
  appKey: string,
  cookie: string,
): Promise<void> {
  const sessionId = await verifyCookie(cookie, appKey)
  if (sessionId) {
    await kv.delete(`session:${sessionId}`)
  }
}

async function signCookie(sessionId: string, appKey: string): Promise<string> {
  const sig = await hmacSign(appKey, sessionId)
  return `${sessionId}.${sig}`
}

async function verifyCookie(cookie: string, appKey: string): Promise<string | null> {
  const dotIndex = cookie.lastIndexOf('.')
  if (dotIndex === -1) return null

  const sessionId = cookie.slice(0, dotIndex)
  const sig = cookie.slice(dotIndex + 1)

  const valid = await hmacVerify(appKey, sessionId, sig)
  return valid ? sessionId : null
}
