import type { Hono } from 'hono'
import type { Env, HonoVariables } from '../types/env'
import { authApp } from './auth'
import { clientApp } from './client'
import { accountApp } from './client/account'
import { adminApp } from './admin'
import { remoteApp } from './remote'

type AppType = { Bindings: Env; Variables: HonoVariables }

export function registerRoutes(app: Hono<AppType>) {
  // Health check
  app.get('/api/health', (c) => c.json({ status: 'ok', version: '1.0.0' }))

  // Auth
  app.route('/api/auth', authApp)

  // CSRF cookie endpoint
  app.get('/api/sanctum/csrf-cookie', (c) => c.body(null, 204))

  // Client account
  app.route('/api/client/account', accountApp)

  // Client (servers, nests, etc.)
  app.route('/api/client', clientApp)

  // Remote API — daemon-to-panel communication
  app.route('/api/remote', remoteApp)

  // Application (admin) API
  app.route('/api/application', adminApp)

  // Catch-all: return API info for non-API routes
  app.all('*', (c) =>
    c.json(
      {
        name: 'Pyrotype API',
        version: '1.0.0',
        docs: '/api/health',
        endpoints: ['/api/auth', '/api/client', '/api/application', '/api/remote'],
      },
      404,
    ),
  )
}
