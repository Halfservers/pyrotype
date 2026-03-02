import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import supertest from 'supertest';
import { loadUser } from '../../src/middleware/loadUser';
import { errorHandler } from '../../src/middleware/errorHandler';
import { routes } from '../../src/routes';

/**
 * Creates a fully-configured Express app for testing.
 * Uses in-memory session store (no Redis needed).
 */
export function createTestApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(
    session({
      secret: 'test-secret-key-for-vitest',
      resave: false,
      saveUninitialized: false,
      name: 'pyrotype_session',
      cookie: { httpOnly: true, secure: false, sameSite: 'lax' },
    }),
  );

  app.use(loadUser);
  app.use(routes);
  app.use(errorHandler);

  return app;
}

/**
 * Creates a supertest agent that persists cookies (session) across requests.
 */
export function createAgent(app?: express.Express) {
  const testApp = app || createTestApp();
  return supertest.agent(testApp);
}

/**
 * Logs in as a user and returns the authenticated agent.
 */
export async function createAuthenticatedAgent(
  credentials: { user: string; password: string } = { user: 'admin', password: 'password' },
) {
  const agent = createAgent();

  // Get CSRF cookie
  await agent.get('/api/sanctum/csrf-cookie').expect(204);

  // Login
  const loginRes = await agent
    .post('/api/auth/login')
    .send(credentials)
    .expect(200);

  return { agent, loginResponse: loginRes.body };
}

/**
 * Creates a one-shot supertest request (no session persistence).
 */
export function request(app?: express.Express) {
  const testApp = app || createTestApp();
  return supertest(testApp);
}
