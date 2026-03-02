import { Router } from 'express';
import { requireDaemonType } from '../../../middleware/daemonType';
import { requirePermission } from '../../../middleware/permissions';
import { rateLimiter } from '../../../middleware/rateLimiter';

// Server
import { getServer } from '../../../controllers/client/servers/elytra/serverController';
// Websocket
import { getWebsocket } from '../../../controllers/client/servers/elytra/websocketController';
// Resources
import { getResources } from '../../../controllers/client/servers/elytra/resourceController';
// Activity
import { getActivity } from '../../../controllers/client/servers/elytra/activityController';
// Command & Power
import { sendCommand } from '../../../controllers/client/servers/elytra/commandController';
import { sendPower } from '../../../controllers/client/servers/elytra/powerController';
// Databases
import * as db from '../../../controllers/client/servers/elytra/databaseController';
// Files
import * as files from '../../../controllers/client/servers/elytra/fileController';
import { getUploadUrl } from '../../../controllers/client/servers/elytra/fileUploadController';
// Backups
import * as backups from '../../../controllers/client/servers/elytra/backupsController';
// Schedules
import * as schedules from '../../../controllers/client/servers/elytra/scheduleController';
import * as scheduleTasks from '../../../controllers/client/servers/elytra/scheduleTaskController';
// Network
import * as network from '../../../controllers/client/servers/elytra/networkController';
// Startup
import * as startup from '../../../controllers/client/servers/elytra/startupController';
// Settings
import * as settings from '../../../controllers/client/servers/elytra/settingsController';
// Elytra Jobs
import * as jobs from '../../../controllers/client/servers/elytra/elytraJobsController';
// Subdomains
import * as subdomains from '../../../controllers/client/servers/elytra/subdomainController';

export const elytraServerRoutes = Router({ mergeParams: true });

// All routes here are scoped to /api/client/servers/elytra/:server
// The middleware stack ensures: authenticated user, server access, resource belongs to server, daemon type = elytra
elytraServerRoutes.use(requireDaemonType('elytra'));

// Core server endpoints
elytraServerRoutes.get('/', getServer);
elytraServerRoutes.get('/websocket', getWebsocket);
elytraServerRoutes.get('/resources', getResources);
elytraServerRoutes.get('/activity', getActivity);

// Command & Power
elytraServerRoutes.post('/command', requirePermission('control.console'), sendCommand);
elytraServerRoutes.post('/power', requirePermission('control.start'), sendPower);

// Databases
elytraServerRoutes.get('/databases', requirePermission('database.read'), db.listDatabases);
elytraServerRoutes.post('/databases', requirePermission('database.create'), db.createDatabase);
elytraServerRoutes.post('/databases/:database/rotate-password', requirePermission('database.update'), db.rotatePassword);
elytraServerRoutes.delete('/databases/:database', requirePermission('database.delete'), db.deleteDatabase);

// Files
elytraServerRoutes.get('/files/list', requirePermission('file.read'), files.listDirectory);
elytraServerRoutes.get('/files/contents', requirePermission('file.read-content'), files.getContents);
elytraServerRoutes.get('/files/download', requirePermission('file.read-content'), files.downloadFile);
elytraServerRoutes.put('/files/rename', requirePermission('file.update'), files.renameFile);
elytraServerRoutes.post('/files/copy', requirePermission('file.create'), files.copyFile);
elytraServerRoutes.post('/files/write', requirePermission('file.update'), files.writeFile);
elytraServerRoutes.post('/files/compress', requirePermission('file.archive'), files.compressFiles);
elytraServerRoutes.post('/files/decompress', requirePermission('file.archive'), files.decompressFiles);
elytraServerRoutes.post('/files/delete', requirePermission('file.delete'), files.deleteFiles);
elytraServerRoutes.post('/files/create-folder', requirePermission('file.create'), files.createFolder);
elytraServerRoutes.post('/files/chmod', requirePermission('file.update'), files.chmodFiles);
elytraServerRoutes.post('/files/pull', requirePermission('file.create'), rateLimiter(10, 300000), files.pullFile);
elytraServerRoutes.get('/files/upload', requirePermission('file.create'), getUploadUrl);

// Schedules
elytraServerRoutes.get('/schedules', requirePermission('schedule.read'), schedules.listSchedules);
elytraServerRoutes.post('/schedules', requirePermission('schedule.create'), schedules.createSchedule);
elytraServerRoutes.get('/schedules/:schedule', requirePermission('schedule.read'), schedules.viewSchedule);
elytraServerRoutes.post('/schedules/:schedule', requirePermission('schedule.update'), schedules.updateSchedule);
elytraServerRoutes.post('/schedules/:schedule/execute', requirePermission('schedule.update'), schedules.executeSchedule);
elytraServerRoutes.delete('/schedules/:schedule', requirePermission('schedule.delete'), schedules.deleteSchedule);

// Schedule Tasks
elytraServerRoutes.post('/schedules/:schedule/tasks', requirePermission('schedule.update'), scheduleTasks.createTask);
elytraServerRoutes.post('/schedules/:schedule/tasks/:task', requirePermission('schedule.update'), scheduleTasks.updateTask);
elytraServerRoutes.delete('/schedules/:schedule/tasks/:task', scheduleTasks.deleteTask);

// Network / Allocations
elytraServerRoutes.get('/network/allocations', requirePermission('allocation.read'), network.listAllocations);
elytraServerRoutes.post('/network/allocations', requirePermission('allocation.create'), network.createAllocation);
elytraServerRoutes.post('/network/allocations/:allocation', requirePermission('allocation.update'), network.updateAllocation);
elytraServerRoutes.post('/network/allocations/:allocation/primary', requirePermission('allocation.update'), network.setPrimaryAllocation);
elytraServerRoutes.delete('/network/allocations/:allocation', requirePermission('allocation.delete'), network.deleteAllocation);

// Elytra Jobs
elytraServerRoutes.get('/jobs', jobs.listJobs);
elytraServerRoutes.post('/jobs', rateLimiter(10, 60000), jobs.createJob);
elytraServerRoutes.get('/jobs/:jobId', jobs.showJob);
elytraServerRoutes.delete('/jobs/:jobId', jobs.cancelJob);

// Backups
elytraServerRoutes.get('/backups', requirePermission('backup.read'), backups.listBackups);
elytraServerRoutes.post('/backups', requirePermission('backup.create'), rateLimiter(10, 60000), backups.createBackup);
elytraServerRoutes.delete('/backups/delete-all', requirePermission('backup.delete'), rateLimiter(2, 3600000), backups.deleteAllBackups);
elytraServerRoutes.post('/backups/bulk-delete', requirePermission('backup.delete'), rateLimiter(10, 3600000), backups.bulkDeleteBackups);
elytraServerRoutes.get('/backups/:backup', requirePermission('backup.read'), backups.showBackup);
elytraServerRoutes.get('/backups/:backup/download', requirePermission('backup.download'), backups.downloadBackup);
elytraServerRoutes.post('/backups/:backup/restore', requirePermission('backup.restore'), rateLimiter(10, 60000), backups.restoreBackup);
elytraServerRoutes.post('/backups/:backup/rename', requirePermission('backup.delete'), backups.renameBackup);
elytraServerRoutes.post('/backups/:backup/lock', requirePermission('backup.delete'), backups.toggleLock);
elytraServerRoutes.delete('/backups/:backup', requirePermission('backup.delete'), backups.destroyBackup);

// Startup
elytraServerRoutes.get('/startup', requirePermission('startup.read'), startup.getStartup);
elytraServerRoutes.put('/startup/variable', requirePermission('startup.update'), startup.updateVariable);
elytraServerRoutes.put('/startup/command', requirePermission('startup.update'), startup.updateCommand);
elytraServerRoutes.get('/startup/command/default', requirePermission('startup.read'), startup.getDefaultCommand);
elytraServerRoutes.post('/startup/command/process', requirePermission('startup.read'), startup.processCommand);

// Settings
elytraServerRoutes.post('/settings/rename', requirePermission('settings.rename'), settings.rename);
elytraServerRoutes.post('/settings/reinstall', requirePermission('settings.reinstall'), rateLimiter(10, 60000), settings.reinstall);
elytraServerRoutes.put('/settings/docker-image', requirePermission('startup.docker-image'), settings.setDockerImage);
elytraServerRoutes.post('/settings/docker-image/revert', requirePermission('startup.docker-image'), settings.revertDockerImage);
elytraServerRoutes.put('/settings/egg', requirePermission('settings.egg'), settings.changeEgg);
elytraServerRoutes.post('/settings/egg/preview', requirePermission('settings.egg'), rateLimiter(10, 60000), settings.previewEggChange);
elytraServerRoutes.post('/settings/egg/apply', requirePermission('settings.egg'), rateLimiter(10, 60000), settings.applyEggChange);

// Operations
elytraServerRoutes.get('/operations', settings.getServerOperations);
elytraServerRoutes.get('/operations/:operationId', settings.getOperationStatus);

// Subdomains (uses users/ prefix in PHP but separate controller for Elytra)
elytraServerRoutes.get('/subdomains', subdomains.listSubdomains);
elytraServerRoutes.post('/subdomains', subdomains.createSubdomain);
elytraServerRoutes.delete('/subdomains', subdomains.destroySubdomain);
elytraServerRoutes.post('/subdomains/check', subdomains.checkAvailability);
