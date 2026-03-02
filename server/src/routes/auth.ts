import { Router } from 'express';
import { login, logout } from '../controllers/auth/loginController';
import { handle as loginCheckpoint } from '../controllers/auth/loginCheckpointController';
import { sendResetLink } from '../controllers/auth/forgotPasswordController';
import { handle as resetPassword } from '../controllers/auth/resetPasswordController';
import { rateLimit } from '../middleware/rateLimiter';

export const authRoutes = Router();

// Rate-limit login attempts: 5 per minute
authRoutes.post('/api/auth/login', rateLimit(5, 1), login);
authRoutes.post('/api/auth/login/checkpoint', rateLimit(5, 1), loginCheckpoint);

authRoutes.post('/api/auth/password', rateLimit(3, 1), sendResetLink);
authRoutes.post('/api/auth/password/reset', rateLimit(3, 1), resetPassword);

authRoutes.post('/api/auth/logout', logout);

// CSRF cookie endpoint (no-op for session-based auth, frontend expects this)
authRoutes.get('/api/sanctum/csrf-cookie', (_req, res) => {
  res.status(204).send();
});
