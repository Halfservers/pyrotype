import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { NotFoundError } from '../../../../utils/errors'
import { fractalItem, fractalPaginated } from '../../../../utils/response'
import { logActivity } from '../../../../services/activity'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function listJobs(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const jobType = c.req.query('type')
  const jobStatus = c.req.query('status')
  const perPage = Math.min(50, Math.max(1, parseInt(c.req.query('per_page') ?? '') || 20))
  const page = Math.max(1, parseInt(c.req.query('page') ?? '') || 1)
  const skip = (page - 1) * perPage

  const where: Record<string, unknown> = { serverId: server.id }
  if (jobType) where.jobType = jobType
  if (jobStatus) where.status = jobStatus

  const [jobs, total] = await Promise.all([
    prisma.elytraJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.elytraJob.count({ where }),
  ])

  return c.json(fractalPaginated('elytra_job', jobs, total, page, perPage))
}

export async function createJob(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const { job_type, job_data } = await c.req.json()

  if (!job_type || typeof job_type !== 'string') {
    return c.json({ error: 'A job type must be provided.' }, 422)
  }

  const job = await prisma.elytraJob.create({
    data: {
      uuid: crypto.randomUUID(),
      serverId: server.id,
      userId: user.id,
      jobType: job_type,
      jobData: job_data ?? {},
      status: 'pending',
    },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:job.create',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { job_type, job_uuid: job.uuid },
  })

  return c.json({
    job_id: job.uuid,
    status: 'queued',
    type: job_type,
  })
}

export async function showJob(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const jobId = c.req.param('jobId')

  const job = await prisma.elytraJob.findFirst({
    where: { uuid: String(jobId), serverId: server.id },
  })

  if (!job) {
    throw new NotFoundError('Job not found.')
  }

  return c.json(fractalItem('elytra_job', job))
}

export async function cancelJob(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const jobId = c.req.param('jobId')

  const job = await prisma.elytraJob.findFirst({
    where: { uuid: String(jobId), serverId: server.id },
  })

  if (!job) {
    throw new NotFoundError('Job not found.')
  }

  await prisma.elytraJob.update({
    where: { id: job.id },
    data: { status: 'cancelled' },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:job.cancel',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { job_uuid: job.uuid },
  })

  return c.json({
    job_id: job.uuid,
    status: 'cancelled',
  })
}
