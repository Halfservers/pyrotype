import { describe, it, expect, vi, beforeAll } from 'vitest';
import { TooManyRequestsError } from '../../src/utils/errors';

// The setup.ts globally mocks rateLimiter. We need the real implementation.
// Use vi.importActual to get the original module.
let rateLimit: (maxRequests: number, windowMinutes: number) => any;

beforeAll(async () => {
  const actual = await vi.importActual<typeof import('../../src/middleware/rateLimiter')>(
    '../../src/middleware/rateLimiter',
  );
  rateLimit = actual.rateLimit;
});

function createMockReq(ip: string, path: string) {
  return { ip, path } as any;
}

function createMockRes() {
  return {} as any;
}

describe('rate limiter middleware', () => {
  // Each test uses a unique path to avoid collisions in the shared requestCounts Map
  let pathCounter = 0;
  function uniquePath() {
    return `/rate-test-${++pathCounter}-${Date.now()}`;
  }

  it('should allow requests under the limit', () => {
    const path = uniquePath();
    const middleware = rateLimit(5, 1);
    const res = createMockRes();

    for (let i = 0; i < 5; i++) {
      const next = vi.fn();
      middleware(createMockReq('127.0.0.1', path), res, next);
      expect(next).toHaveBeenCalledWith();
      expect(next.mock.calls[0]).toHaveLength(0);
    }
  });

  it('should block requests over the limit (429)', () => {
    const path = uniquePath();
    const middleware = rateLimit(3, 1);
    const res = createMockRes();

    // First 3 requests should succeed
    for (let i = 0; i < 3; i++) {
      const next = vi.fn();
      middleware(createMockReq('127.0.0.1', path), res, next);
      expect(next).toHaveBeenCalledWith();
      expect(next.mock.calls[0]).toHaveLength(0);
    }

    // 4th request should be rate limited
    const next = vi.fn();
    middleware(createMockReq('127.0.0.1', path), res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(TooManyRequestsError);
  });

  it('should reset after window expires', () => {
    vi.useFakeTimers();

    const path = uniquePath();
    const middleware = rateLimit(2, 1); // 2 requests per 1 minute
    const res = createMockRes();

    // Use up the limit
    for (let i = 0; i < 2; i++) {
      const next = vi.fn();
      middleware(createMockReq('127.0.0.1', path), res, next);
      expect(next.mock.calls[0]).toHaveLength(0);
    }

    // Should be blocked
    const blockedNext = vi.fn();
    middleware(createMockReq('127.0.0.1', path), res, blockedNext);
    expect(blockedNext.mock.calls[0][0]).toBeInstanceOf(TooManyRequestsError);

    // Advance time past the window (1 minute = 60000ms)
    vi.advanceTimersByTime(60001);

    // Should be allowed again
    const allowedNext = vi.fn();
    middleware(createMockReq('127.0.0.1', path), res, allowedNext);
    expect(allowedNext).toHaveBeenCalledWith();
    expect(allowedNext.mock.calls[0]).toHaveLength(0);

    vi.useRealTimers();
  });

  it('should track different IPs independently', () => {
    const path = uniquePath();
    const middleware = rateLimit(1, 1);
    const res = createMockRes();

    // First IP: first request succeeds
    const next1 = vi.fn();
    middleware(createMockReq('10.0.0.1', path), res, next1);
    expect(next1.mock.calls[0]).toHaveLength(0);

    // Second IP: first request also succeeds
    const next2 = vi.fn();
    middleware(createMockReq('10.0.0.2', path), res, next2);
    expect(next2.mock.calls[0]).toHaveLength(0);

    // First IP: second request blocked
    const next3 = vi.fn();
    middleware(createMockReq('10.0.0.1', path), res, next3);
    expect(next3.mock.calls[0][0]).toBeInstanceOf(TooManyRequestsError);
  });

  it('should track different paths independently', () => {
    const path1 = uniquePath();
    const path2 = uniquePath();
    const middleware = rateLimit(1, 1);
    const res = createMockRes();

    // Path 1: first request succeeds
    const next1 = vi.fn();
    middleware(createMockReq('127.0.0.1', path1), res, next1);
    expect(next1.mock.calls[0]).toHaveLength(0);

    // Path 2: first request also succeeds
    const next2 = vi.fn();
    middleware(createMockReq('127.0.0.1', path2), res, next2);
    expect(next2.mock.calls[0]).toHaveLength(0);

    // Path 1: second request blocked
    const next3 = vi.fn();
    middleware(createMockReq('127.0.0.1', path1), res, next3);
    expect(next3.mock.calls[0][0]).toBeInstanceOf(TooManyRequestsError);

    // Path 2: second request also blocked
    const next4 = vi.fn();
    middleware(createMockReq('127.0.0.1', path2), res, next4);
    expect(next4.mock.calls[0][0]).toBeInstanceOf(TooManyRequestsError);
  });

  it('should allow exactly maxRequests', () => {
    const path = uniquePath();
    const middleware = rateLimit(1, 1);
    const res = createMockRes();

    const next1 = vi.fn();
    middleware(createMockReq('127.0.0.1', path), res, next1);
    expect(next1.mock.calls[0]).toHaveLength(0);

    const next2 = vi.fn();
    middleware(createMockReq('127.0.0.1', path), res, next2);
    expect(next2.mock.calls[0][0]).toBeInstanceOf(TooManyRequestsError);
  });
});
