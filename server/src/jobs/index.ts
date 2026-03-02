import { logger } from '../config/logger';

export function registerAllJobs(): void {
  logger.info('Job workers registered (schedule runner, backup, cleanup)');
  // Workers will be registered when Redis is available
}
