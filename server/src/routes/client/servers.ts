import { Router } from 'express';
import * as serverController from '../../controllers/client/serverController';

export const clientServerRoutes = Router();

clientServerRoutes.get('/:server', serverController.index);
clientServerRoutes.get('/:server/resources', serverController.resources);
