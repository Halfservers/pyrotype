import { Queue, Worker } from 'bullmq';
import { logger } from './logger';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

export function createQueue(name: string): Queue {
  return new Queue(name, { connection });
}

export function createWorker(name: string, processor: (job: any) => Promise<void>): Worker {
  const worker = new Worker(name, processor, { connection });
  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} in queue ${name} failed:`, err);
  });
  return worker;
}
