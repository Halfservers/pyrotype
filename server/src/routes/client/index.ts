import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth';
import * as clientController from '../../controllers/client/clientController';
import * as serverController from '../../controllers/client/serverController';
import * as nestController from '../../controllers/client/nestController';
import { wingsServerRoutes } from './servers/wings';
import { elytraServerRoutes } from './servers/elytra';

export const clientRoutes = Router();

// All client routes require authentication
clientRoutes.use(isAuthenticated);

// Root client endpoints
clientRoutes.get('/', clientController.index);
clientRoutes.get('/permissions', clientController.permissions);
clientRoutes.get('/version', (_req, res) => {
  res.json({ version: process.env.APP_VERSION || '1.0.0' });
});

// Nests
clientRoutes.get('/nests', nestController.index);
clientRoutes.get('/nests/:nest', nestController.view);

// Server detail and resources (daemon-agnostic)
clientRoutes.get('/servers/:server', serverController.index);
clientRoutes.get('/servers/:server/resources', serverController.resources);

// Wings daemon server routes: /api/client/servers/wings/:server/...
clientRoutes.use('/servers/wings', wingsServerRoutes);

// Elytra daemon server routes: /api/client/servers/elytra/:server/...
clientRoutes.use('/servers/elytra', elytraServerRoutes);
