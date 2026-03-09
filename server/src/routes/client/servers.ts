import { Hono } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import * as serverController from '../../controllers/client/serverController'

type AppType = { Bindings: Env; Variables: HonoVariables }

export const clientServerApp = new Hono<AppType>()

clientServerApp.get('/:server', serverController.index)
clientServerApp.get('/:server/resources', serverController.resources)
