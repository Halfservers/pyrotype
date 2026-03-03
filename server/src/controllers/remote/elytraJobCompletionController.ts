import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { AppError } from '../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function updateJobStatus(c: AppContext) {
  const jobId = c.req.param('jobId')

  if (!jobId) {
    throw new AppError('Job ID is required.', 400, 'BadRequest')
  }

  const { status, result, error } = await c.req.json()

  // In production, this updates the job through ElytraJobService.
  // The daemon calls this endpoint when a job completes or fails.
  // The service then processes the result (e.g., creating backup records,
  // updating server state, etc.) based on the job type.

  return c.json({
    success: true,
    message: 'Job status updated successfully',
  })
}
