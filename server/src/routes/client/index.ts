import { Hono } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { isAuthenticated } from '../../middleware/auth'
import * as clientController from '../../controllers/client/clientController'
import * as serverController from '../../controllers/client/serverController'
import * as nestController from '../../controllers/client/nestController'
import * as accountController from '../../controllers/client/accountController'
import * as apiKeyController from '../../controllers/client/apiKeyController'
import * as sshKeyController from '../../controllers/client/sshKeyController'
import * as activityLogController from '../../controllers/client/activityLogController'
import * as twoFactorController from '../../controllers/client/twoFactorController'
import * as notificationController from '../../controllers/client/notificationController'
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

// ── Account ─────────────────────────────────────────────────────────────
clientApp.get('/account', accountController.index)
clientApp.put('/account/email', accountController.updateEmail)
clientApp.put('/account/password', accountController.updatePassword)

// Two-factor auth
clientApp.get('/account/two-factor', twoFactorController.index)
clientApp.post('/account/two-factor', twoFactorController.store)
clientApp.post('/account/two-factor/disable', twoFactorController.deleteTwoFactor)

// Account activity
clientApp.get('/account/activity', activityLogController.index)

// Account API keys
clientApp.get('/account/api-keys', apiKeyController.index)
clientApp.post('/account/api-keys', apiKeyController.store)
clientApp.delete('/account/api-keys/:identifier', apiKeyController.deleteKey)

// Account SSH keys
clientApp.get('/account/ssh-keys', sshKeyController.index)
clientApp.post('/account/ssh-keys', sshKeyController.store)
clientApp.post('/account/ssh-keys/remove', sshKeyController.deleteSSHKey)

// Account notifications
clientApp.get('/account/notifications', notificationController.index)
clientApp.post('/account/notifications/mark-read', notificationController.markRead)
clientApp.post('/account/notifications/mark-all-read', notificationController.markAllRead)
clientApp.delete('/account/notifications/:id', notificationController.deleteFn)

// Server detail and resources (daemon-agnostic)
clientApp.get('/servers/:server', serverController.index)
clientApp.get('/servers/:server/resources', serverController.resources)

// Wings daemon server routes: /api/client/servers/wings/...
clientApp.route('/servers/wings', wingsServerApp)

// Elytra daemon server routes: /api/client/servers/elytra/...
clientApp.route('/servers/elytra', elytraServerApp)
