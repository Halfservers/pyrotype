import { Router } from 'express';
import * as nestController from '../../controllers/client/nestController';

export const nestRoutes = Router();

nestRoutes.get('/', nestController.index);
nestRoutes.get('/:nest', nestController.view);
