import { Router } from 'express';
import { authRoutes } from './auth';
import { accountRoutes } from './client/account';
import { clientRoutes } from './client/index';
import { adminRoutes } from './admin';
import { elytraServerRoutes } from './client/servers/elytra';
import { remoteRoutes } from './remote';

export const routes = Router();

// Health check
routes.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Auth routes (login, logout, password reset)
routes.use(authRoutes);

// Client account routes (authenticated)
routes.use('/api/client/account', accountRoutes);

// Client routes (servers, nests, etc.)
routes.use('/api/client', clientRoutes);

// Elytra server routes — /api/client/servers/elytra/:server/*
routes.use('/api/client/servers/elytra/:server', elytraServerRoutes);

// Remote API — daemon-to-panel communication — /api/remote/*
routes.use('/api/remote', remoteRoutes);

// Application (admin) API — /api/application/*
routes.use('/api/application', adminRoutes);
