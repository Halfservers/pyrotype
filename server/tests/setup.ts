import { beforeAll, afterAll, vi } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Mock ioredis before anything else
vi.mock('ioredis', () => {
  const MockRedis = vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
    on: vi.fn(),
    status: 'ready',
  }));
  return { default: MockRedis, Redis: MockRedis };
});

// Mock BullMQ
vi.mock('bullmq', () => ({
  Queue: vi.fn(() => ({
    add: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Worker: vi.fn(() => ({
    close: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  })),
  QueueScheduler: vi.fn(() => ({
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
    })),
  },
  createTransport: vi.fn(() => ({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
  })),
}));

// Mock winston logger to reduce noise
vi.mock('../src/config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock rate limiter to be a passthrough in tests (rate limiting is tested separately)
vi.mock('../src/middleware/rateLimiter', () => ({
  rateLimit: () => (_req: any, _res: any, next: any) => next(),
  rateLimiter: () => (_req: any, _res: any, next: any) => next(),
}));

const TEST_DB_PATH = path.resolve(__dirname, '../prisma/test.db');
const SOURCE_DB_PATH = path.resolve(__dirname, '../prisma/dev.db');

beforeAll(() => {
  // Copy dev.db to test.db so tests have seeded data
  if (fs.existsSync(SOURCE_DB_PATH)) {
    fs.copyFileSync(SOURCE_DB_PATH, TEST_DB_PATH);
  }
});

afterAll(() => {
  // Clean up test database
  try {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  } catch {
    // ignore cleanup errors
  }
});
