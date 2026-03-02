import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../../utils/errors';

export async function sendCommand(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const command = req.body.command as string;

    if (!command || typeof command !== 'string') {
      throw new AppError('A command must be provided.', 422, 'ValidationError');
    }

    // In production, this sends the command to the Elytra daemon via HTTP.
    // The daemon connection would be made through the node's connection address.
    // Placeholder: daemon call would happen here.

    // TODO: Activity log: server:console.command

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
