import { Hono } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { isAuthenticated } from '../../middleware/auth'
import * as clientController from '../../controllers/client/clientController'
import * as serverController from '../../controllers/client/serverController'
import * as nestController from '../../controllers/client/nestController'
import { wingsServerApp } from './servers/wings'
import { elytraServerApp } from './servers/elytra'

type AppType = { Bindings: Env; Variables: HonoVariables }

export const clientApp = new Hono<AppType>()

// All client routes require authentication
clientApp.use('*', isAuthenticated)

// Root client endpoints
clientApp.get('/', clientController.index)
clientApp.get('/permissions', clientController.permissions)
clientApp.get('/version', (c) => {
  return c.json({ version: c.env.APP_VERSION || '1.0.0' })
})

// Nests
clientApp.get('/nests', nestController.index)
clientApp.get('/nests/:nest', nestController.view)

// Server detail and resources (daemon-agnostic)
clientApp.get('/servers/:server', serverController.index)
clientApp.get('/servers/:server/resources', serverController.resources)

// Wings daemon server routes: /api/client/servers/wings/...
clientApp.route('/servers/wings', wingsServerApp)

// Elytra daemon server routes: /api/client/servers/elytra/...
clientApp.route('/servers/elytra', elytraServerApp)
