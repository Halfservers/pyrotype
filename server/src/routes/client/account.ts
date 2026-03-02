import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth';
import * as accountController from '../../controllers/client/accountController';
import * as twoFactorController from '../../controllers/client/twoFactorController';
import * as apiKeyController from '../../controllers/client/apiKeyController';
import * as sshKeyController from '../../controllers/client/sshKeyController';
import * as activityLogController from '../../controllers/client/activityLogController';

export const accountRoutes = Router();

// All account routes require authentication
accountRoutes.use(isAuthenticated);

// Account info
accountRoutes.get('/', accountController.index);
accountRoutes.put('/email', accountController.updateEmail);
accountRoutes.put('/password', accountController.updatePassword);

// Two-factor authentication
accountRoutes.get('/two-factor', twoFactorController.index);
accountRoutes.post('/two-factor', twoFactorController.store);
accountRoutes.post('/two-factor/disable', twoFactorController.deleteTwoFactor);

// API keys
accountRoutes.get('/api-keys', apiKeyController.index);
accountRoutes.post('/api-keys', apiKeyController.store);
accountRoutes.delete('/api-keys/:identifier', apiKeyController.deleteKey);

// SSH keys
accountRoutes.get('/ssh-keys', sshKeyController.index);
accountRoutes.post('/ssh-keys', sshKeyController.store);
accountRoutes.post('/ssh-keys/remove', sshKeyController.deleteSSHKey);

// Activity logs
accountRoutes.get('/activity', activityLogController.index);
