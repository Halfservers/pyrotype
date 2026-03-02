import { Router } from 'express';
import { requirePermission } from '../../../middleware/permissions';
import { requireDaemonType } from '../../../middleware/daemonType';
import * as wingsServerCtrl from '../../../controllers/client/servers/wings/serverController';
import * as websocketCtrl from '../../../controllers/client/servers/wings/websocketController';
import * as resourceCtrl from '../../../controllers/client/servers/wings/resourceController';
import * as activityCtrl from '../../../controllers/client/servers/wings/activityController';
import * as commandCtrl from '../../../controllers/client/servers/wings/commandController';
import * as powerCtrl from '../../../controllers/client/servers/wings/powerController';
import * as databaseCtrl from '../../../controllers/client/servers/wings/databaseController';
import * as fileCtrl from '../../../controllers/client/servers/wings/fileController';
import * as backupCtrl from '../../../controllers/client/servers/wings/backupController';
import * as scheduleCtrl from '../../../controllers/client/servers/wings/scheduleController';
import * as scheduleTaskCtrl from '../../../controllers/client/servers/wings/scheduleTaskController';
import * as networkCtrl from '../../../controllers/client/servers/wings/networkController';
import * as startupCtrl from '../../../controllers/client/servers/wings/startupController';
import * as settingsCtrl from '../../../controllers/client/servers/wings/settingsController';
import * as subuserCtrl from '../../../controllers/client/servers/subuserController';

export const wingsServerRoutes = Router({ mergeParams: true });

// Apply daemon type check middleware for all Wings routes
wingsServerRoutes.use(requireDaemonType('wings'));

// ---- Server basics ----
wingsServerRoutes.get('/:server', wingsServerCtrl.index);
wingsServerRoutes.get('/:server/websocket', websocketCtrl.index);
wingsServerRoutes.get('/:server/resources', resourceCtrl.index);
wingsServerRoutes.get('/:server/activity', activityCtrl.index);

// ---- Commands & Power ----
wingsServerRoutes.post('/:server/command', requirePermission('control.console'), commandCtrl.index);
wingsServerRoutes.post('/:server/power', powerCtrl.index);

// ---- Databases ----
wingsServerRoutes.get('/:server/databases', databaseCtrl.index);
wingsServerRoutes.post('/:server/databases', databaseCtrl.store);
wingsServerRoutes.post('/:server/databases/:database/rotate-password', databaseCtrl.rotatePassword);
wingsServerRoutes.delete('/:server/databases/:database', databaseCtrl.deleteFn);

// ---- Files ----
wingsServerRoutes.get('/:server/files/list', fileCtrl.directory);
wingsServerRoutes.get('/:server/files/contents', fileCtrl.contents);
wingsServerRoutes.get('/:server/files/download', fileCtrl.download);
wingsServerRoutes.put('/:server/files/rename', fileCtrl.rename);
wingsServerRoutes.post('/:server/files/copy', fileCtrl.copy);
wingsServerRoutes.post('/:server/files/write', fileCtrl.write);
wingsServerRoutes.post('/:server/files/compress', fileCtrl.compress);
wingsServerRoutes.post('/:server/files/decompress', fileCtrl.decompress);
wingsServerRoutes.post('/:server/files/delete', fileCtrl.deleteFn);
wingsServerRoutes.post('/:server/files/create-folder', fileCtrl.create);
wingsServerRoutes.post('/:server/files/chmod', fileCtrl.chmod);
wingsServerRoutes.post('/:server/files/pull', fileCtrl.pull);
wingsServerRoutes.get('/:server/files/upload', fileCtrl.upload);

// ---- Schedules ----
wingsServerRoutes.get('/:server/schedules', scheduleCtrl.index);
wingsServerRoutes.post('/:server/schedules', scheduleCtrl.store);
wingsServerRoutes.get('/:server/schedules/:schedule', scheduleCtrl.view);
wingsServerRoutes.post('/:server/schedules/:schedule', scheduleCtrl.update);
wingsServerRoutes.post('/:server/schedules/:schedule/execute', scheduleCtrl.execute);
wingsServerRoutes.delete('/:server/schedules/:schedule', scheduleCtrl.deleteFn);

// Schedule tasks
wingsServerRoutes.post('/:server/schedules/:schedule/tasks', scheduleTaskCtrl.store);
wingsServerRoutes.post('/:server/schedules/:schedule/tasks/:task', scheduleTaskCtrl.update);
wingsServerRoutes.delete('/:server/schedules/:schedule/tasks/:task', scheduleTaskCtrl.deleteFn);

// ---- Network ----
wingsServerRoutes.get('/:server/network/allocations', networkCtrl.index);
wingsServerRoutes.post('/:server/network/allocations', networkCtrl.store);
wingsServerRoutes.post('/:server/network/allocations/:allocation', networkCtrl.update);
wingsServerRoutes.post('/:server/network/allocations/:allocation/primary', networkCtrl.setPrimary);
wingsServerRoutes.delete('/:server/network/allocations/:allocation', networkCtrl.deleteFn);

// ---- Users (subusers) ----
wingsServerRoutes.get('/:server/users', subuserCtrl.index);
wingsServerRoutes.post('/:server/users', subuserCtrl.store);
wingsServerRoutes.get('/:server/users/:user', subuserCtrl.view);
wingsServerRoutes.post('/:server/users/:user', subuserCtrl.update);
wingsServerRoutes.delete('/:server/users/:user', subuserCtrl.deleteFn);

// ---- Backups ----
wingsServerRoutes.get('/:server/backups', backupCtrl.index);
wingsServerRoutes.post('/:server/backups', backupCtrl.store);
wingsServerRoutes.get('/:server/backups/:backup', backupCtrl.view);
wingsServerRoutes.get('/:server/backups/:backup/download', backupCtrl.download);
wingsServerRoutes.post('/:server/backups/:backup/lock', backupCtrl.toggleLock);
wingsServerRoutes.post('/:server/backups/:backup/restore', backupCtrl.restore);
wingsServerRoutes.delete('/:server/backups/:backup', backupCtrl.deleteFn);

// ---- Startup ----
wingsServerRoutes.get('/:server/startup', startupCtrl.index);
wingsServerRoutes.put('/:server/startup/variable', startupCtrl.update);
wingsServerRoutes.put('/:server/startup/command', startupCtrl.updateCommand);
wingsServerRoutes.get('/:server/startup/command/default', startupCtrl.getDefaultCommand);
wingsServerRoutes.post('/:server/startup/command/process', startupCtrl.processCommand);

// ---- Settings ----
wingsServerRoutes.post('/:server/settings/rename', settingsCtrl.rename);
wingsServerRoutes.post('/:server/settings/reinstall', settingsCtrl.reinstall);
wingsServerRoutes.put('/:server/settings/docker-image', settingsCtrl.dockerImage);
wingsServerRoutes.put('/:server/settings/egg', settingsCtrl.changeEgg);
wingsServerRoutes.post('/:server/settings/egg/preview', settingsCtrl.previewEggChange);
wingsServerRoutes.post('/:server/settings/egg/apply', settingsCtrl.applyEggChange);
