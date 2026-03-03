import { Hono } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { isAuthenticated } from '../../middleware/auth'
import * as accountController from '../../controllers/client/accountController'
import * as twoFactorController from '../../controllers/client/twoFactorController'
import * as apiKeyController from '../../controllers/client/apiKeyController'
import * as sshKeyController from '../../controllers/client/sshKeyController'
import * as activityLogController from '../../controllers/client/activityLogController'

type AppType = { Bindings: Env; Variables: HonoVariables }

export const accountApp = new Hono<AppType>()

// All account routes require authentication
accountApp.use('*', isAuthenticated)

// Account info
accountApp.get('/', accountController.index)
accountApp.put('/email', accountController.updateEmail)
accountApp.put('/password', accountController.updatePassword)

// Two-factor authentication
accountApp.get('/two-factor', twoFactorController.index)
accountApp.post('/two-factor', twoFactorController.store)
accountApp.post('/two-factor/disable', twoFactorController.deleteTwoFactor)

// API keys
accountApp.get('/api-keys', apiKeyController.index)
accountApp.post('/api-keys', apiKeyController.store)
accountApp.delete('/api-keys/:identifier', apiKeyController.deleteKey)

// SSH keys
accountApp.get('/ssh-keys', sshKeyController.index)
accountApp.post('/ssh-keys', sshKeyController.store)
accountApp.post('/ssh-keys/remove', sshKeyController.deleteSSHKey)

// Activity logs
accountApp.get('/activity', activityLogController.index)
