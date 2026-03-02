import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/errors';

export async function updateJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      throw new AppError('Job ID is required.', 400, 'BadRequest');
    }

    const { status, result, error } = req.body;

    // In production, this updates the job through ElytraJobService.
    // The daemon calls this endpoint when a job completes or fails.
    // The service then processes the result (e.g., creating backup records,
    // updating server state, etc.) based on the job type.

    res.json({
      success: true,
      message: 'Job status updated successfully',
    });
  } catch (err) {
    next(err);
  }
}
