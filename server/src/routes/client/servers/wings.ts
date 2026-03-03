import { Hono } from 'hono'
import type { Env, HonoVariables } from '../../../types/env'
import { requirePermission } from '../../../middleware/permissions'
import { requireDaemonType } from '../../../middleware/daemonType'
import * as wingsServerCtrl from '../../../controllers/client/servers/wings/serverController'
import * as websocketCtrl from '../../../controllers/client/servers/wings/websocketController'
import * as resourceCtrl from '../../../controllers/client/servers/wings/resourceController'
import * as activityCtrl from '../../../controllers/client/servers/wings/activityController'
import * as commandCtrl from '../../../controllers/client/servers/wings/commandController'
import * as powerCtrl from '../../../controllers/client/servers/wings/powerController'
import * as databaseCtrl from '../../../controllers/client/servers/wings/databaseController'
import * as fileCtrl from '../../../controllers/client/servers/wings/fileController'
import * as backupCtrl from '../../../controllers/client/servers/wings/backupController'
import * as scheduleCtrl from '../../../controllers/client/servers/wings/scheduleController'
import * as scheduleTaskCtrl from '../../../controllers/client/servers/wings/scheduleTaskController'
import * as networkCtrl from '../../../controllers/client/servers/wings/networkController'
import * as startupCtrl from '../../../controllers/client/servers/wings/startupController'
import * as settingsCtrl from '../../../controllers/client/servers/wings/settingsController'
import * as subuserCtrl from '../../../controllers/client/servers/subuserController'

type AppType = { Bindings: Env; Variables: HonoVariables }

export const wingsServerApp = new Hono<AppType>()

// Apply daemon type check middleware for all Wings routes
wingsServerApp.use('*', requireDaemonType('wings'))

// ---- Server basics ----
wingsServerApp.get('/:server', wingsServerCtrl.index)
wingsServerApp.get('/:server/websocket', websocketCtrl.index)
wingsServerApp.get('/:server/resources', resourceCtrl.index)
wingsServerApp.get('/:server/activity', activityCtrl.index)

// ---- Commands & Power ----
wingsServerApp.post('/:server/command', requirePermission('control.console'), commandCtrl.index)
wingsServerApp.post('/:server/power', powerCtrl.index)

// ---- Databases ----
wingsServerApp.get('/:server/databases', databaseCtrl.index)
wingsServerApp.post('/:server/databases', databaseCtrl.store)
wingsServerApp.post('/:server/databases/:database/rotate-password', databaseCtrl.rotatePassword)
wingsServerApp.delete('/:server/databases/:database', databaseCtrl.deleteFn)

// ---- Files ----
wingsServerApp.get('/:server/files/list', fileCtrl.directory)
wingsServerApp.get('/:server/files/contents', fileCtrl.contents)
wingsServerApp.get('/:server/files/download', fileCtrl.download)
wingsServerApp.put('/:server/files/rename', fileCtrl.rename)
wingsServerApp.post('/:server/files/copy', fileCtrl.copy)
wingsServerApp.post('/:server/files/write', fileCtrl.write)
wingsServerApp.post('/:server/files/compress', fileCtrl.compress)
wingsServerApp.post('/:server/files/decompress', fileCtrl.decompress)
wingsServerApp.post('/:server/files/delete', fileCtrl.deleteFn)
wingsServerApp.post('/:server/files/create-folder', fileCtrl.create)
wingsServerApp.post('/:server/files/chmod', fileCtrl.chmod)
wingsServerApp.post('/:server/files/pull', fileCtrl.pull)
wingsServerApp.get('/:server/files/upload', fileCtrl.upload)

// ---- Schedules ----
wingsServerApp.get('/:server/schedules', scheduleCtrl.index)
wingsServerApp.post('/:server/schedules', scheduleCtrl.store)
wingsServerApp.get('/:server/schedules/:schedule', scheduleCtrl.view)
wingsServerApp.post('/:server/schedules/:schedule', scheduleCtrl.update)
wingsServerApp.post('/:server/schedules/:schedule/execute', scheduleCtrl.execute)
wingsServerApp.delete('/:server/schedules/:schedule', scheduleCtrl.deleteFn)

// Schedule tasks
wingsServerApp.post('/:server/schedules/:schedule/tasks', scheduleTaskCtrl.store)
wingsServerApp.post('/:server/schedules/:schedule/tasks/:task', scheduleTaskCtrl.update)
wingsServerApp.delete('/:server/schedules/:schedule/tasks/:task', scheduleTaskCtrl.deleteFn)

// ---- Network ----
wingsServerApp.get('/:server/network/allocations', networkCtrl.index)
wingsServerApp.post('/:server/network/allocations', networkCtrl.store)
wingsServerApp.post('/:server/network/allocations/:allocation', networkCtrl.update)
wingsServerApp.post('/:server/network/allocations/:allocation/primary', networkCtrl.setPrimary)
wingsServerApp.delete('/:server/network/allocations/:allocation', networkCtrl.deleteFn)

// ---- Users (subusers) ----
wingsServerApp.get('/:server/users', subuserCtrl.index)
wingsServerApp.post('/:server/users', subuserCtrl.store)
wingsServerApp.get('/:server/users/:user', subuserCtrl.view)
wingsServerApp.post('/:server/users/:user', subuserCtrl.update)
wingsServerApp.delete('/:server/users/:user', subuserCtrl.deleteFn)

// ---- Backups ----
wingsServerApp.get('/:server/backups', backupCtrl.index)
wingsServerApp.post('/:server/backups', backupCtrl.store)
wingsServerApp.get('/:server/backups/:backup', backupCtrl.view)
wingsServerApp.get('/:server/backups/:backup/download', backupCtrl.download)
wingsServerApp.post('/:server/backups/:backup/lock', backupCtrl.toggleLock)
wingsServerApp.post('/:server/backups/:backup/restore', backupCtrl.restore)
wingsServerApp.delete('/:server/backups/:backup', backupCtrl.deleteFn)

// ---- Startup ----
wingsServerApp.get('/:server/startup', startupCtrl.index)
wingsServerApp.put('/:server/startup/variable', startupCtrl.update)
wingsServerApp.put('/:server/startup/command', startupCtrl.updateCommand)
wingsServerApp.get('/:server/startup/command/default', startupCtrl.getDefaultCommand)
wingsServerApp.post('/:server/startup/command/process', startupCtrl.processCommand)

// ---- Settings ----
wingsServerApp.post('/:server/settings/rename', settingsCtrl.rename)
wingsServerApp.post('/:server/settings/reinstall', settingsCtrl.reinstall)
wingsServerApp.put('/:server/settings/docker-image', settingsCtrl.dockerImage)
wingsServerApp.put('/:server/settings/egg', settingsCtrl.changeEgg)
wingsServerApp.post('/:server/settings/egg/preview', settingsCtrl.previewEggChange)
wingsServerApp.post('/:server/settings/egg/apply', settingsCtrl.applyEggChange)
