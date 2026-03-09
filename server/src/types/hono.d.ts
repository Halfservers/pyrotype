import type { Env, HonoVariables } from './env';

/**
 * Shared Hono app type used across all route files and controllers.
 * Import this instead of reconstructing the generic each time.
 */
export type AppBindings = {
  Bindings: Env;
  Variables: HonoVariables;
};
