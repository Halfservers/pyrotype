import { Hono } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { requireAdminAccess } from '../../middleware/apiKeyAuth'
import { validate } from '../../middleware/validate'
import {
  createUserSchema,
  updateUserSchema,
  createNodeSchema,
  updateNodeSchema,
  createServerSchema,
  createLocationSchema,
  updateLocationSchema,
  createAllocationSchema,
  createNestSchema,
  updateNestSchema,
  createEggSchema,
  updateEggSchema,
  createEggVariableSchema,
  updateEggVariableSchema,
  createDatabaseHostSchema,
  updateDatabaseHostSchema,
  createMountSchema,
  updateMountSchema,
  attachEggsSchema,
  attachNodesSchema,
  createDomainSchema,
  updateDomainSchema,
} from '../../validators/admin'
import {
  panelController,
  userController,
  externalUserController,
  nodeController,
  nodeConfigurationController,
  nodeDeploymentController,
  allocationController,
  locationController,
  serverController,
  serverDetailsController,
  serverManagementController,
  startupController,
  databaseController,
  externalServerController,
  nestController,
  eggController,
  eggVariableController,
  settingsController,
  applicationApiKeyController,
  databaseHostController,
  mountController,
  activityLogController,
  domainController,
} from '../../controllers/admin'

type AppType = { Bindings: Env; Variables: HonoVariables }

export const adminApp = new Hono<AppType>()

// All admin routes require application API key authentication
adminApp.use('*', requireAdminAccess)

// ── Panel ──────────────────────────────────────────────────────────────────
adminApp.get('/panel/status', panelController.status)

// ── Activity Logs ─────────────────────────────────────────────────────────
adminApp.get('/activity', activityLogController.index)
adminApp.post('/activity/clear', activityLogController.clear)

// ── Settings ──────────────────────────────────────────────────────────────
adminApp.get('/settings', settingsController.index)
adminApp.patch('/settings', settingsController.update)
adminApp.post('/settings/mail/test', settingsController.testMail)

// ── API Keys ──────────────────────────────────────────────────────────────
adminApp.get('/api-keys', applicationApiKeyController.index)
adminApp.post('/api-keys', applicationApiKeyController.store)
adminApp.delete('/api-keys/:id', applicationApiKeyController.destroy)

// ── Users ──────────────────────────────────────────────────────────────────
adminApp.get('/users', userController.index)
adminApp.get('/users/external/:externalId', externalUserController.index)
adminApp.get('/users/:id', userController.view)
adminApp.post('/users', validate({ body: createUserSchema }), userController.store)
adminApp.patch('/users/:id', validate({ body: updateUserSchema }), userController.update)
adminApp.delete('/users/:id', userController.deleteUser)

// ── Nodes ──────────────────────────────────────────────────────────────────
adminApp.get('/nodes', nodeController.index)
adminApp.get('/nodes/deployable', nodeDeploymentController.index)
adminApp.get('/nodes/:id', nodeController.view)
adminApp.get('/nodes/:id/configuration', nodeConfigurationController.index)
adminApp.post('/nodes', validate({ body: createNodeSchema }), nodeController.store)
adminApp.patch('/nodes/:id', validate({ body: updateNodeSchema }), nodeController.update)
adminApp.delete('/nodes/:id', nodeController.deleteNode)

// ── Node system / config ───────────────────────────────────────────────────
adminApp.get('/nodes/:id/system-information', nodeController.systemInfo)
adminApp.post('/nodes/:id/configuration/token', nodeController.autoDeployToken)

// ── Node Allocations ───────────────────────────────────────────────────────
adminApp.get('/nodes/:id/allocations', allocationController.index)
adminApp.post('/nodes/:id/allocations', validate({ body: createAllocationSchema }), allocationController.store)
adminApp.post('/nodes/:id/allocations/remove-block', allocationController.removeBlock)
adminApp.post('/nodes/:id/allocations/alias', allocationController.setAlias)
adminApp.post('/nodes/:id/allocations/remove-multiple', allocationController.removeMultiple)
adminApp.delete('/nodes/:id/allocations/:allocationId', allocationController.deleteAllocation)

// ── Locations ──────────────────────────────────────────────────────────────
adminApp.get('/locations', locationController.index)
adminApp.get('/locations/:id', locationController.view)
adminApp.post('/locations', validate({ body: createLocationSchema }), locationController.store)
adminApp.patch('/locations/:id', validate({ body: updateLocationSchema }), locationController.update)
adminApp.delete('/locations/:id', locationController.deleteLocation)

// ── Servers ────────────────────────────────────────────────────────────────
adminApp.get('/servers', serverController.index)
adminApp.get('/servers/external/:externalId', externalServerController.index)
adminApp.get('/servers/:id', serverController.view)
adminApp.post('/servers', validate({ body: createServerSchema }), serverController.store)
adminApp.patch('/servers/:id/details', serverDetailsController.details)
adminApp.patch('/servers/:id/build', serverDetailsController.build)
adminApp.patch('/servers/:id/startup', startupController.index)
adminApp.post('/servers/:id/suspend', serverManagementController.suspend)
adminApp.post('/servers/:id/unsuspend', serverManagementController.unsuspend)
adminApp.post('/servers/:id/reinstall', serverManagementController.reinstall)
adminApp.post('/servers/:id/toggle-install', serverManagementController.toggleInstall)
adminApp.post('/servers/:id/transfer', serverManagementController.transfer)
adminApp.post('/servers/:id/mounts', serverController.addServerMount)
adminApp.delete('/servers/:id/mounts/:mountId', serverController.deleteServerMount)
adminApp.delete('/servers/:id/:force', serverController.deleteServer)
adminApp.delete('/servers/:id', serverController.deleteServer)

// ── Server Databases ───────────────────────────────────────────────────────
adminApp.get('/servers/:id/databases', databaseController.index)
adminApp.get('/servers/:id/databases/:dbId', databaseController.view)
adminApp.post('/servers/:id/databases', databaseController.store)
adminApp.post('/servers/:id/databases/:dbId/reset-password', databaseController.resetPassword)
adminApp.delete('/servers/:id/databases/:dbId', databaseController.deleteDatabase)

// ── Database Hosts ────────────────────────────────────────────────────────
adminApp.get('/database-hosts', databaseHostController.index)
adminApp.get('/database-hosts/:id', databaseHostController.view)
adminApp.post('/database-hosts', validate({ body: createDatabaseHostSchema }), databaseHostController.store)
adminApp.patch('/database-hosts/:id', validate({ body: updateDatabaseHostSchema }), databaseHostController.update)
adminApp.delete('/database-hosts/:id', databaseHostController.deleteHost)

// ── Nests ──────────────────────────────────────────────────────────────────
adminApp.get('/nests', nestController.index)
adminApp.post('/nests', validate({ body: createNestSchema }), nestController.store)
adminApp.get('/nests/:id', nestController.view)
adminApp.patch('/nests/:id', validate({ body: updateNestSchema }), nestController.update)
adminApp.delete('/nests/:id', nestController.deleteNest)

// ── Eggs ───────────────────────────────────────────────────────────────────
adminApp.get('/nests/:id/eggs', eggController.index)
adminApp.get('/nests/:id/eggs/:eggId/export', eggController.exportEgg)
adminApp.get('/nests/:id/eggs/:eggId', eggController.view)
adminApp.post('/nests/:id/eggs/import', eggController.importEgg)
adminApp.post('/nests/:id/eggs', validate({ body: createEggSchema }), eggController.store)
adminApp.patch('/nests/:id/eggs/:eggId', validate({ body: updateEggSchema }), eggController.update)
adminApp.delete('/nests/:id/eggs/:eggId', eggController.deleteEgg)

// ── Mounts ────────────────────────────────────────────────────────────────
adminApp.get('/mounts', mountController.index)
adminApp.get('/mounts/:id', mountController.view)
adminApp.post('/mounts', validate({ body: createMountSchema }), mountController.store)
adminApp.patch('/mounts/:id', validate({ body: updateMountSchema }), mountController.update)
adminApp.delete('/mounts/:id', mountController.deleteMount)
adminApp.post('/mounts/:id/eggs', validate({ body: attachEggsSchema }), mountController.addEggs)
adminApp.post('/mounts/:id/nodes', validate({ body: attachNodesSchema }), mountController.addNodes)
adminApp.delete('/mounts/:id/eggs/:eggId', mountController.deleteEgg)
adminApp.delete('/mounts/:id/nodes/:nodeId', mountController.deleteNode)

// ── Egg Variables ─────────────────────────────────────────────────────────
adminApp.get('/nests/:id/eggs/:eggId/variables', eggVariableController.index)
adminApp.post('/nests/:id/eggs/:eggId/variables', validate({ body: createEggVariableSchema }), eggVariableController.store)
adminApp.patch('/nests/:id/eggs/:eggId/variables/:variableId', validate({ body: updateEggVariableSchema }), eggVariableController.update)
adminApp.delete('/nests/:id/eggs/:eggId/variables/:variableId', eggVariableController.deleteVariable)

// ── Domains ───────────────────────────────────────────────────────────────
adminApp.get('/domains', domainController.index)
adminApp.get('/domains/provider-schema/:provider', domainController.providerSchema)
adminApp.post('/domains/test-connection', domainController.testConnection)
adminApp.get('/domains/:id', domainController.view)
adminApp.post('/domains', validate({ body: createDomainSchema }), domainController.store)
adminApp.patch('/domains/:id', validate({ body: updateDomainSchema }), domainController.update)
adminApp.delete('/domains/:id', domainController.deleteDomain)
