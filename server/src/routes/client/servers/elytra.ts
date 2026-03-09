import { Hono } from 'hono'
import type { Env, HonoVariables } from '../../../types/env'
import { requireDaemonType } from '../../../middleware/daemonType'
import { requirePermission } from '../../../middleware/permissions'
import { rateLimiter } from '../../../middleware/rateLimiter'

// Server
import { getServer } from '../../../controllers/client/servers/elytra/serverController'
// Websocket
import { getWebsocket } from '../../../controllers/client/servers/elytra/websocketController'
// Resources
import { getResources } from '../../../controllers/client/servers/elytra/resourceController'
// Activity
import { getActivity } from '../../../controllers/client/servers/elytra/activityController'
// Command & Power
import { sendCommand } from '../../../controllers/client/servers/elytra/commandController'
import { sendPower } from '../../../controllers/client/servers/elytra/powerController'
// Databases
import * as db from '../../../controllers/client/servers/elytra/databaseController'
// Files
import * as files from '../../../controllers/client/servers/elytra/fileController'
import { getUploadUrl } from '../../../controllers/client/servers/elytra/fileUploadController'
// Backups
import * as backups from '../../../controllers/client/servers/elytra/backupsController'
// Schedules
import * as schedules from '../../../controllers/client/servers/elytra/scheduleController'
import * as scheduleTasks from '../../../controllers/client/servers/elytra/scheduleTaskController'
// Network
import * as network from '../../../controllers/client/servers/elytra/networkController'
// Startup
import * as startup from '../../../controllers/client/servers/elytra/startupController'
// Settings
import * as settings from '../../../controllers/client/servers/elytra/settingsController'
// Elytra Jobs
import * as jobs from '../../../controllers/client/servers/elytra/elytraJobsController'
// Subdomains
import * as subdomains from '../../../controllers/client/servers/elytra/subdomainController'

type AppType = { Bindings: Env; Variables: HonoVariables }

export const elytraServerApp = new Hono<AppType>()

// All routes here are scoped to /api/client/servers/elytra/:server
// The middleware stack ensures: authenticated user, server access, resource belongs to server, daemon type = elytra
elytraServerApp.use('*', requireDaemonType('elytra'))

// Core server endpoints
elytraServerApp.get('/:server', getServer)
elytraServerApp.get('/:server/websocket', getWebsocket)
elytraServerApp.get('/:server/resources', getResources)
elytraServerApp.get('/:server/activity', getActivity)

// Command & Power
elytraServerApp.post('/:server/command', requirePermission('control.console'), sendCommand)
elytraServerApp.post('/:server/power', requirePermission('control.start'), sendPower)

// Databases
elytraServerApp.get('/:server/databases', requirePermission('database.read'), db.listDatabases)
elytraServerApp.post('/:server/databases', requirePermission('database.create'), db.createDatabase)
elytraServerApp.post('/:server/databases/:database/rotate-password', requirePermission('database.update'), db.rotatePassword)
elytraServerApp.delete('/:server/databases/:database', requirePermission('database.delete'), db.deleteDatabase)

// Files
elytraServerApp.get('/:server/files/list', requirePermission('file.read'), files.listDirectory)
elytraServerApp.get('/:server/files/contents', requirePermission('file.read-content'), files.getContents)
elytraServerApp.get('/:server/files/download', requirePermission('file.read-content'), files.downloadFile)
elytraServerApp.put('/:server/files/rename', requirePermission('file.update'), files.renameFile)
elytraServerApp.post('/:server/files/copy', requirePermission('file.create'), files.copyFile)
elytraServerApp.post('/:server/files/write', requirePermission('file.update'), files.writeFile)
elytraServerApp.post('/:server/files/compress', requirePermission('file.archive'), files.compressFiles)
elytraServerApp.post('/:server/files/decompress', requirePermission('file.archive'), files.decompressFiles)
elytraServerApp.post('/:server/files/delete', requirePermission('file.delete'), files.deleteFiles)
elytraServerApp.post('/:server/files/create-folder', requirePermission('file.create'), files.createFolder)
elytraServerApp.post('/:server/files/chmod', requirePermission('file.update'), files.chmodFiles)
elytraServerApp.post('/:server/files/pull', requirePermission('file.create'), rateLimiter(10, 300000), files.pullFile)
elytraServerApp.get('/:server/files/upload', requirePermission('file.create'), getUploadUrl)

// Schedules
elytraServerApp.get('/:server/schedules', requirePermission('schedule.read'), schedules.listSchedules)
elytraServerApp.post('/:server/schedules', requirePermission('schedule.create'), schedules.createSchedule)
elytraServerApp.get('/:server/schedules/:schedule', requirePermission('schedule.read'), schedules.viewSchedule)
elytraServerApp.post('/:server/schedules/:schedule', requirePermission('schedule.update'), schedules.updateSchedule)
elytraServerApp.post('/:server/schedules/:schedule/execute', requirePermission('schedule.update'), schedules.executeSchedule)
elytraServerApp.delete('/:server/schedules/:schedule', requirePermission('schedule.delete'), schedules.deleteSchedule)

// Schedule Tasks
elytraServerApp.post('/:server/schedules/:schedule/tasks', requirePermission('schedule.update'), scheduleTasks.createTask)
elytraServerApp.post('/:server/schedules/:schedule/tasks/:task', requirePermission('schedule.update'), scheduleTasks.updateTask)
elytraServerApp.delete('/:server/schedules/:schedule/tasks/:task', scheduleTasks.deleteTask)

// Network / Allocations
elytraServerApp.get('/:server/network/allocations', requirePermission('allocation.read'), network.listAllocations)
elytraServerApp.post('/:server/network/allocations', requirePermission('allocation.create'), network.createAllocation)
elytraServerApp.post('/:server/network/allocations/:allocation', requirePermission('allocation.update'), network.updateAllocation)
elytraServerApp.post('/:server/network/allocations/:allocation/primary', requirePermission('allocation.update'), network.setPrimaryAllocation)
elytraServerApp.delete('/:server/network/allocations/:allocation', requirePermission('allocation.delete'), network.deleteAllocation)

// Elytra Jobs
elytraServerApp.get('/:server/jobs', jobs.listJobs)
elytraServerApp.post('/:server/jobs', rateLimiter(10, 60000), jobs.createJob)
elytraServerApp.get('/:server/jobs/:jobId', jobs.showJob)
elytraServerApp.delete('/:server/jobs/:jobId', jobs.cancelJob)

// Backups
elytraServerApp.get('/:server/backups', requirePermission('backup.read'), backups.listBackups)
elytraServerApp.post('/:server/backups', requirePermission('backup.create'), rateLimiter(10, 60000), backups.createBackup)
elytraServerApp.delete('/:server/backups/delete-all', requirePermission('backup.delete'), rateLimiter(2, 3600000), backups.deleteAllBackups)
elytraServerApp.post('/:server/backups/bulk-delete', requirePermission('backup.delete'), rateLimiter(10, 3600000), backups.bulkDeleteBackups)
elytraServerApp.get('/:server/backups/:backup', requirePermission('backup.read'), backups.showBackup)
elytraServerApp.get('/:server/backups/:backup/download', requirePermission('backup.download'), backups.downloadBackup)
elytraServerApp.post('/:server/backups/:backup/restore', requirePermission('backup.restore'), rateLimiter(10, 60000), backups.restoreBackup)
elytraServerApp.post('/:server/backups/:backup/rename', requirePermission('backup.delete'), backups.renameBackup)
elytraServerApp.post('/:server/backups/:backup/lock', requirePermission('backup.delete'), backups.toggleLock)
elytraServerApp.delete('/:server/backups/:backup', requirePermission('backup.delete'), backups.destroyBackup)

// Startup
elytraServerApp.get('/:server/startup', requirePermission('startup.read'), startup.getStartup)
elytraServerApp.put('/:server/startup/variable', requirePermission('startup.update'), startup.updateVariable)
elytraServerApp.put('/:server/startup/command', requirePermission('startup.update'), startup.updateCommand)
elytraServerApp.get('/:server/startup/command/default', requirePermission('startup.read'), startup.getDefaultCommand)
elytraServerApp.post('/:server/startup/command/process', requirePermission('startup.read'), startup.processCommand)

// Settings
elytraServerApp.post('/:server/settings/rename', requirePermission('settings.rename'), settings.rename)
elytraServerApp.post('/:server/settings/reinstall', requirePermission('settings.reinstall'), rateLimiter(10, 60000), settings.reinstall)
elytraServerApp.put('/:server/settings/docker-image', requirePermission('startup.docker-image'), settings.setDockerImage)
elytraServerApp.post('/:server/settings/docker-image/revert', requirePermission('startup.docker-image'), settings.revertDockerImage)
elytraServerApp.put('/:server/settings/egg', requirePermission('settings.egg'), settings.changeEgg)
elytraServerApp.post('/:server/settings/egg/preview', requirePermission('settings.egg'), rateLimiter(10, 60000), settings.previewEggChange)
elytraServerApp.post('/:server/settings/egg/apply', requirePermission('settings.egg'), rateLimiter(10, 60000), settings.applyEggChange)

// Operations
elytraServerApp.get('/:server/operations', settings.getServerOperations)
elytraServerApp.get('/:server/operations/:operationId', settings.getOperationStatus)

// Subdomains
elytraServerApp.get('/:server/subdomains', subdomains.listSubdomains)
elytraServerApp.post('/:server/subdomains', subdomains.createSubdomain)
elytraServerApp.delete('/:server/subdomains', subdomains.destroySubdomain)
elytraServerApp.post('/:server/subdomains/check', subdomains.checkAvailability)
