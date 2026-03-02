import { Router } from 'express';
import { requireAdminAccess } from '../../middleware/apiKeyAuth';
import { validate } from '../../middleware/validate';
import {
  createUserSchema,
  updateUserSchema,
  createNodeSchema,
  updateNodeSchema,
  createServerSchema,
  createLocationSchema,
  updateLocationSchema,
  createAllocationSchema,
} from '../../validators/admin';
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
} from '../../controllers/admin';

export const adminRoutes = Router();

// All admin routes require application API key authentication
adminRoutes.use(requireAdminAccess);

// ── Panel ──────────────────────────────────────────────────────────────────
adminRoutes.get('/panel/status', panelController.status);

// ── Users ──────────────────────────────────────────────────────────────────
adminRoutes.get('/users', userController.index);
adminRoutes.get('/users/external/:externalId', externalUserController.index);
adminRoutes.get('/users/:id', userController.view);
adminRoutes.post('/users', validate({ body: createUserSchema }), userController.store);
adminRoutes.patch('/users/:id', validate({ body: updateUserSchema }), userController.update);
adminRoutes.delete('/users/:id', userController.deleteUser);

// ── Nodes ──────────────────────────────────────────────────────────────────
adminRoutes.get('/nodes', nodeController.index);
adminRoutes.get('/nodes/deployable', nodeDeploymentController.index);
adminRoutes.get('/nodes/:id', nodeController.view);
adminRoutes.get('/nodes/:id/configuration', nodeConfigurationController.index);
adminRoutes.post('/nodes', validate({ body: createNodeSchema }), nodeController.store);
adminRoutes.patch('/nodes/:id', validate({ body: updateNodeSchema }), nodeController.update);
adminRoutes.delete('/nodes/:id', nodeController.deleteNode);

// ── Node Allocations ───────────────────────────────────────────────────────
adminRoutes.get('/nodes/:id/allocations', allocationController.index);
adminRoutes.post('/nodes/:id/allocations', validate({ body: createAllocationSchema }), allocationController.store);
adminRoutes.delete('/nodes/:id/allocations/:allocationId', allocationController.deleteAllocation);

// ── Locations ──────────────────────────────────────────────────────────────
adminRoutes.get('/locations', locationController.index);
adminRoutes.get('/locations/:id', locationController.view);
adminRoutes.post('/locations', validate({ body: createLocationSchema }), locationController.store);
adminRoutes.patch('/locations/:id', validate({ body: updateLocationSchema }), locationController.update);
adminRoutes.delete('/locations/:id', locationController.deleteLocation);

// ── Servers ────────────────────────────────────────────────────────────────
adminRoutes.get('/servers', serverController.index);
adminRoutes.get('/servers/external/:externalId', externalServerController.index);
adminRoutes.get('/servers/:id', serverController.view);
adminRoutes.post('/servers', validate({ body: createServerSchema }), serverController.store);
adminRoutes.patch('/servers/:id/details', serverDetailsController.details);
adminRoutes.patch('/servers/:id/build', serverDetailsController.build);
adminRoutes.patch('/servers/:id/startup', startupController.index);
adminRoutes.post('/servers/:id/suspend', serverManagementController.suspend);
adminRoutes.post('/servers/:id/unsuspend', serverManagementController.unsuspend);
adminRoutes.post('/servers/:id/reinstall', serverManagementController.reinstall);
adminRoutes.delete('/servers/:id/:force', serverController.deleteServer);
adminRoutes.delete('/servers/:id', serverController.deleteServer);

// ── Server Databases ───────────────────────────────────────────────────────
adminRoutes.get('/servers/:id/databases', databaseController.index);
adminRoutes.get('/servers/:id/databases/:dbId', databaseController.view);
adminRoutes.post('/servers/:id/databases', databaseController.store);
adminRoutes.post('/servers/:id/databases/:dbId/reset-password', databaseController.resetPassword);
adminRoutes.delete('/servers/:id/databases/:dbId', databaseController.deleteDatabase);

// ── Nests ──────────────────────────────────────────────────────────────────
adminRoutes.get('/nests', nestController.index);
adminRoutes.get('/nests/:id', nestController.view);
adminRoutes.get('/nests/:id/eggs', eggController.index);
adminRoutes.get('/nests/:id/eggs/:eggId', eggController.view);
