import { Hono } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import * as nestController from '../../controllers/client/nestController'

type AppType = { Bindings: Env; Variables: HonoVariables }

export const nestsApp = new Hono<AppType>()

nestsApp.get('/', nestController.index)
nestsApp.get('/:nest', nestController.view)
