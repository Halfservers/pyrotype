import { vi } from 'vitest';

// Mock logger to reduce noise
vi.mock('../src/config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
