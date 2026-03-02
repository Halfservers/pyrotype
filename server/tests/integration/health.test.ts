import { describe, it, expect } from 'vitest';
import { request } from '../helpers/test-app';

describe('GET /api/health', () => {
  it('should return 200 with status ok and version', async () => {
    const res = await request().get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', version: '1.0.0' });
  });

  it('should have correct content-type header', async () => {
    const res = await request().get('/api/health');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('should respond to HEAD requests', async () => {
    const res = await request().head('/api/health');

    expect(res.status).toBe(200);
    // HEAD should not return a body
    expect(res.text).toBeFalsy();
  });

  it('should return 404 or appropriate status for POST /api/health', async () => {
    const res = await request().post('/api/health');

    // Express returns 404 for routes that don't match POST method on a GET-only route
    // because there is no POST handler registered for /api/health
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('should return 404 or appropriate status for PUT /api/health', async () => {
    const res = await request().put('/api/health');

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('should return 404 or appropriate status for DELETE /api/health', async () => {
    const res = await request().delete('/api/health');

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
