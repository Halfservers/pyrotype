import { Hono } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { authenticateDaemonToken } from '../../middleware/remoteAuth'

// Controllers
import { authenticateSftp } from '../../controllers/remote/sftpAuthenticationController'
import {
  listServers,
  getServerDetails,
  resetState,
} from '../../controllers/remote/serverDetailsController'
import { processActivity } from '../../controllers/remote/activityController'
import {
  getInstallation,
  reportInstallation,
} from '../../controllers/remote/installController'
import { getRusticConfig } from '../../controllers/remote/rusticConfigController'
import {
  updateBackupSizes,
} from '../../controllers/remote/backupStatusController'
import {
  reportBackupComplete,
  reportBackupRestore,
  getBackupUploadUrl,
  deleteBackupRemote,
} from '../../controllers/remote/backupStatusController'
import {
  transferFailure,
  transferSuccess,
} from '../../controllers/remote/transferController'
import { updateJobStatus } from '../../controllers/remote/elytraJobCompletionController'

type AppType = { Bindings: Env; Variables: HonoVariables }

export const remoteApp = new Hono<AppType>()

// All remote API routes require daemon token authentication
remoteApp.use('*', authenticateDaemonToken)

// SFTP Authentication
remoteApp.post('/sftp/auth', authenticateSftp)

// Server listing & state management
remoteApp.get('/servers', listServers)
remoteApp.post('/servers/reset', resetState)

// Activity processing
remoteApp.post('/activity', processActivity)

// Per-server routes
remoteApp.get('/servers/:uuid', getServerDetails)
remoteApp.get('/servers/:uuid/install', getInstallation)
remoteApp.post('/servers/:uuid/install', reportInstallation)

// Rustic backup configuration
remoteApp.get('/servers/:uuid/rustic-config', getRusticConfig)

// Backup size updates (from Elytra deduplication recalculation)
remoteApp.post('/servers/:uuid/backup-sizes', updateBackupSizes)

// Transfer callbacks
remoteApp.get('/servers/:uuid/transfer/failure', transferFailure)
remoteApp.post('/servers/:uuid/transfer/failure', transferFailure)
remoteApp.get('/servers/:uuid/transfer/success', transferSuccess)
remoteApp.post('/servers/:uuid/transfer/success', transferSuccess)

// Backup remote operations (daemon callbacks)
remoteApp.get('/backups/:backup', getBackupUploadUrl)
remoteApp.delete('/backups/:backup', deleteBackupRemote)
remoteApp.post('/backups/:backup', reportBackupComplete)
remoteApp.post('/backups/:backup/restore', reportBackupRestore)

// Elytra job completion callbacks
remoteApp.put('/elytra-jobs/:jobId', updateJobStatus)
