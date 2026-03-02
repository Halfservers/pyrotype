import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../../utils/errors';

const VALID_SIGNALS = ['start', 'stop', 'restart', 'kill'] as const;

export async function sendPower(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const signal = req.body.signal as string;

    if (!signal || !VALID_SIGNALS.includes(signal as typeof VALID_SIGNALS[number])) {
      throw new AppError('An invalid power signal was provided.', 422, 'ValidationError');
    }

    // In production, this sends the power action to the Elytra daemon.
    // TODO: Activity log: server:power.{signal}

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
