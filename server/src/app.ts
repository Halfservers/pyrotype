import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { logger as honoLogger } from 'hono/logger'
import type { Env, HonoVariables } from './types/env'
import { createPrisma } from './config/database'
import { loadUser } from './middleware/loadUser'
import { onError } from './middleware/errorHandler'
import { registerRoutes } from './routes'

type AppType = { Bindings: Env; Variables: HonoVariables }

export function createApp() {
  const app = new Hono<AppType>()

  // Secure headers (replaces helmet)
  app.use('*', secureHeaders())
  // CORS (replaces cors middleware)
  app.use('*', cors({ origin: '*', credentials: true }))
  // Request logging
  app.use('*', honoLogger())

  // Prisma + KV + Queue setup per request
  app.use('*', async (c, next) => {
    const prisma = createPrisma(c.env.DB)
    c.set('prisma', prisma)
    c.set('kv', c.env.SESSION_KV)
    c.set('queue', c.env.JOB_QUEUE)
    await next()
  })

  // Load user from session
  app.use('*', loadUser)

  // Register all routes
  registerRoutes(app)

  // Error handler
  app.onError(onError)

  return app
}
