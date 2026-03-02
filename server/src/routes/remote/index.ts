import { Router } from 'express';
import { authenticateDaemonToken } from '../../middleware/remoteAuth';

// Controllers
import { authenticateSftp } from '../../controllers/remote/sftpAuthenticationController';
import {
  listServers,
  getServerDetails,
  resetState,
} from '../../controllers/remote/serverDetailsController';
import { processActivity } from '../../controllers/remote/activityController';
import {
  getInstallation,
  reportInstallation,
} from '../../controllers/remote/installController';
import { getRusticConfig } from '../../controllers/remote/rusticConfigController';
import {
  updateBackupSizes,
} from '../../controllers/remote/backupStatusController';
import {
  reportBackupComplete,
  reportBackupRestore,
  getBackupUploadUrl,
  deleteBackupRemote,
} from '../../controllers/remote/backupStatusController';
import {
  transferFailure,
  transferSuccess,
} from '../../controllers/remote/transferController';
import { updateJobStatus } from '../../controllers/remote/elytraJobCompletionController';

export const remoteRoutes = Router();

// All remote API routes require daemon token authentication
remoteRoutes.use(authenticateDaemonToken);

// SFTP Authentication
remoteRoutes.post('/sftp/auth', authenticateSftp);

// Server listing & state management
remoteRoutes.get('/servers', listServers);
remoteRoutes.post('/servers/reset', resetState);

// Activity processing
remoteRoutes.post('/activity', processActivity);

// Per-server routes
remoteRoutes.get('/servers/:uuid', getServerDetails);
remoteRoutes.get('/servers/:uuid/install', getInstallation);
remoteRoutes.post('/servers/:uuid/install', reportInstallation);

// Rustic backup configuration
remoteRoutes.get('/servers/:uuid/rustic-config', getRusticConfig);

// Backup size updates (from Elytra deduplication recalculation)
remoteRoutes.post('/servers/:uuid/backup-sizes', updateBackupSizes);

// Transfer callbacks
remoteRoutes.get('/servers/:uuid/transfer/failure', transferFailure);
remoteRoutes.post('/servers/:uuid/transfer/failure', transferFailure);
remoteRoutes.get('/servers/:uuid/transfer/success', transferSuccess);
remoteRoutes.post('/servers/:uuid/transfer/success', transferSuccess);

// Backup remote operations (daemon callbacks)
remoteRoutes.get('/backups/:backup', getBackupUploadUrl);
remoteRoutes.delete('/backups/:backup', deleteBackupRemote);
remoteRoutes.post('/backups/:backup', reportBackupComplete);
remoteRoutes.post('/backups/:backup/restore', reportBackupRestore);

// Elytra job completion callbacks
remoteRoutes.put('/elytra-jobs/:jobId', updateJobStatus);
