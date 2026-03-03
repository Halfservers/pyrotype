import { Hono } from 'hono'
import type { Env, HonoVariables } from '../types/env'
import { login, logout } from '../controllers/auth/loginController'
import { handle as loginCheckpoint } from '../controllers/auth/loginCheckpointController'
import { sendResetLink } from '../controllers/auth/forgotPasswordController'
import { handle as resetPassword } from '../controllers/auth/resetPasswordController'
import { rateLimit } from '../middleware/rateLimiter'

type AppType = { Bindings: Env; Variables: HonoVariables }

export const authApp = new Hono<AppType>()

// Rate-limit login attempts: 5 per minute
authApp.post('/login', rateLimit(5, 1), login)
authApp.post('/login/checkpoint', rateLimit(5, 1), loginCheckpoint)

authApp.post('/password', rateLimit(3, 1), sendResetLink)
authApp.post('/password/reset', rateLimit(3, 1), resetPassword)

authApp.post('/logout', logout)
