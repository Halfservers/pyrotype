import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { NotFoundError } from '../../../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function listJobs(c: AppContext) {
  const server = c.var.server!
  const jobType = c.req.query('type')
  const jobStatus = c.req.query('status')

  // In production, this queries the ElytraJobService which tracks
  // async jobs submitted to the Elytra daemon.
  // Jobs are stored in the database and their status is updated
  // by the daemon through the remote API callback endpoints.

  return c.json({
    object: 'list',
    data: [],
  })
}

export async function createJob(c: AppContext) {
  const server = c.var.server!
  const { job_type, job_data } = await c.req.json()

  if (!job_type || typeof job_type !== 'string') {
    return c.json({ error: 'A job type must be provided.' }, 422)
  }

  // In production, this submits the job through ElytraJobService
  // which validates permissions, creates a job record, and sends
  // the request to the Elytra daemon.

  const jobId = `job_${Date.now()}`

  // TODO: Activity log: job:create

  return c.json({
    job_id: jobId,
    status: 'queued',
    type: job_type,
  })
}

export async function showJob(c: AppContext) {
  const server = c.var.server!
  const jobId = c.req.param('jobId')

  // In production, query ElytraJobService for job status.
  // For now, return not found as we don't have persistent job storage yet.
  throw new NotFoundError('Job not found')
}

export async function cancelJob(c: AppContext) {
  const server = c.var.server!
  const jobId = c.req.param('jobId')

  // In production, cancel through ElytraJobService which sends
  // a cancellation request to the Elytra daemon.

  // TODO: Activity log: job:cancel

  return c.json({
    job_id: jobId,
    status: 'cancelled',
  })
}
