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
} from '../../controllers/admin'

type AppType = { Bindings: Env; Variables: HonoVariables }

export const adminApp = new Hono<AppType>()

// All admin routes require application API key authentication
adminApp.use('*', requireAdminAccess)

// ── Panel ──────────────────────────────────────────────────────────────────
adminApp.get('/panel/status', panelController.status)

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

// ── Node Allocations ───────────────────────────────────────────────────────
adminApp.get('/nodes/:id/allocations', allocationController.index)
adminApp.post('/nodes/:id/allocations', validate({ body: createAllocationSchema }), allocationController.store)
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
adminApp.delete('/servers/:id/:force', serverController.deleteServer)
adminApp.delete('/servers/:id', serverController.deleteServer)

// ── Server Databases ───────────────────────────────────────────────────────
adminApp.get('/servers/:id/databases', databaseController.index)
adminApp.get('/servers/:id/databases/:dbId', databaseController.view)
adminApp.post('/servers/:id/databases', databaseController.store)
adminApp.post('/servers/:id/databases/:dbId/reset-password', databaseController.resetPassword)
adminApp.delete('/servers/:id/databases/:dbId', databaseController.deleteDatabase)

// ── Nests ──────────────────────────────────────────────────────────────────
adminApp.get('/nests', nestController.index)
adminApp.get('/nests/:id', nestController.view)
adminApp.get('/nests/:id/eggs', eggController.index)
adminApp.get('/nests/:id/eggs/:eggId', eggController.view)
