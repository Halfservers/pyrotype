import type { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../../../../utils/errors';

export async function listJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const jobType = req.query.type as string | undefined;
    const jobStatus = req.query.status as string | undefined;

    // In production, this queries the ElytraJobService which tracks
    // async jobs submitted to the Elytra daemon.
    // Jobs are stored in the database and their status is updated
    // by the daemon through the remote API callback endpoints.

    res.json({
      object: 'list',
      data: [],
    });
  } catch (err) {
    next(err);
  }
}

export async function createJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { job_type, job_data } = req.body;

    if (!job_type || typeof job_type !== 'string') {
      res.status(422).json({ error: 'A job type must be provided.' });
      return;
    }

    // In production, this submits the job through ElytraJobService
    // which validates permissions, creates a job record, and sends
    // the request to the Elytra daemon.

    const jobId = `job_${Date.now()}`;

    // TODO: Activity log: job:create

    res.json({
      job_id: jobId,
      status: 'queued',
      type: job_type,
    });
  } catch (err) {
    next(err);
  }
}

export async function showJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { jobId } = req.params;

    // In production, query ElytraJobService for job status.
    // For now, return not found as we don't have persistent job storage yet.
    throw new NotFoundError('Job not found');
  } catch (err) {
    next(err);
  }
}

export async function cancelJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { jobId } = req.params;

    // In production, cancel through ElytraJobService which sends
    // a cancellation request to the Elytra daemon.

    // TODO: Activity log: job:cancel

    res.json({
      job_id: jobId,
      status: 'cancelled',
    });
  } catch (err) {
    next(err);
  }
}
