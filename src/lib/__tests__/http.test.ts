import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ApiError, httpErrorToHuman, setProgressCallbacks, api } from '../http';

// ------------------------------------------------------------------ helpers --
function mockResponse(
  status: number,
  body: unknown,
  options?: { statusText?: string; headers?: Record<string, string> },
): Response {
  const { statusText = '', headers = { 'content-type': 'application/json' } } = options ?? {};
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    clone: () => mockResponse(status, body, options),
  } as unknown as Response;
}

function mockResponseJsonThrows(status: number, statusText: string): Response {
  return {
    ok: false,
    status,
    statusText,
    headers: new Headers(),
    json: () => {
      throw new SyntaxError('Unexpected token');
    },
    text: () => Promise.resolve(statusText),
    clone: function () {
      return this;
    },
  } as unknown as Response;
}

// ---------------------------------------------------------------- ApiError --
describe('ApiError', () => {
  describe('constructor', () => {
    it('sets status, code, and errors', () => {
      const errors = [{ code: 'NotFound', status: '404', detail: 'Not found' }];
      const err = new ApiError(404, 'NotFound', errors);

      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('ApiError');
      expect(err.status).toBe(404);
      expect(err.code).toBe('NotFound');
      expect(err.errors).toBe(errors);
      expect(err.message).toBe('Not found');
    });

    it('falls back to generic message when errors array is empty', () => {
      const err = new ApiError(500, 'ServerError', []);
      expect(err.message).toBe('API error 500');
    });
  });

  describe('fromResponse', () => {
    it('extracts from { errors: [...] } body', async () => {
      const body = { errors: [{ code: 'NotFound', status: '404', detail: 'Not found' }] };
      const err = await ApiError.fromResponse(mockResponse(404, body));

      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(404);
      expect(err.code).toBe('NotFound');
      expect(err.errors).toEqual(body.errors);
    });

    it('wraps { error: string } body in ServerError', async () => {
      const body = { error: 'Something broke' };
      const err = await ApiError.fromResponse(mockResponse(500, body));

      expect(err.code).toBe('HttpError');
      expect(err.errors).toEqual([{ code: 'ServerError', status: '500', detail: 'Something broke' }]);
    });

    it('wraps { message: string } body in ServerError', async () => {
      const body = { message: 'Bad request' };
      const err = await ApiError.fromResponse(mockResponse(400, body));

      expect(err.errors).toEqual([{ code: 'ServerError', status: '400', detail: 'Bad request' }]);
    });

    it('falls back to statusText when json() throws', async () => {
      const err = await ApiError.fromResponse(mockResponseJsonThrows(502, 'Bad Gateway'));

      expect(err.status).toBe(502);
      expect(err.errors).toEqual([{ code: 'HttpError', status: '502', detail: 'Bad Gateway' }]);
    });

    it('falls back to HTTP status string when json() throws and statusText is empty', async () => {
      const err = await ApiError.fromResponse(mockResponseJsonThrows(503, ''));

      expect(err.errors).toEqual([{ code: 'HttpError', status: '503', detail: 'HTTP 503' }]);
    });

    it('falls back when errors array is empty', async () => {
      const body = { errors: [] };
      const err = await ApiError.fromResponse(mockResponse(422, body));

      expect(err.errors).toEqual([{ code: 'HttpError', status: '422', detail: 'HTTP 422' }]);
    });
  });
});

// --------------------------------------------------------- httpErrorToHuman --
describe('httpErrorToHuman', () => {
  it('returns detail from ApiError', () => {
    const err = new ApiError(404, 'NotFound', [{ code: 'NotFound', status: '404', detail: 'Resource not found' }]);
    expect(httpErrorToHuman(err)).toBe('Resource not found');
  });

  it('returns message from a regular Error', () => {
    expect(httpErrorToHuman(new Error('network failure'))).toBe('network failure');
  });

  it('returns default message for non-Error values', () => {
    expect(httpErrorToHuman('oops')).toBe('An unexpected error occurred.');
    expect(httpErrorToHuman(42)).toBe('An unexpected error occurred.');
    expect(httpErrorToHuman(null)).toBe('An unexpected error occurred.');
  });
});

// ----------------------------------------------------- setProgressCallbacks --
describe('setProgressCallbacks', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('calls start and end callbacks around a request', async () => {
    const start = vi.fn();
    const end = vi.fn();
    setProgressCallbacks(start, end);

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(200, { ok: true }));

    await api.get('/test');

    expect(start).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });

  it('calls end callback even when request fails', async () => {
    const start = vi.fn();
    const end = vi.fn();
    setProgressCallbacks(start, end);

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(500, { error: 'fail' }));

    await expect(api.get('/test')).rejects.toThrow();

    expect(start).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });

  it('skips progress callbacks for /resources endpoints', async () => {
    const start = vi.fn();
    const end = vi.fn();
    setProgressCallbacks(start, end);

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(200, { ok: true }));

    await api.get('/servers/resources');

    expect(start).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
  });
});

// -------------------------------------------------------------------- api --
describe('api', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    // Clear progress callbacks to avoid interference
    setProgressCallbacks(() => {}, () => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('api.get sends GET request with query params', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse(200, { data: 'ok' }),
    );

    await api.get('/api/servers', { page: '1', status: 'running' });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/servers?');
    expect(url).toContain('page=1');
    expect(url).toContain('status=running');
    expect(init.method).toBe('GET');
  });

  it('api.get skips null and empty query param values', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse(200, { data: 'ok' }),
    );

    await api.get('/api/test', { keep: 'yes', drop: null, empty: '' });

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('keep=yes');
    expect(url).not.toContain('drop');
    expect(url).not.toContain('empty');
  });

  it('api.post sends POST request with JSON body', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse(200, { created: true }),
    );

    await api.post('/api/servers', { name: 'test' });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/servers');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'test' }));
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('api.post sends string body with text/plain content type', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse(200, 'ok'),
    );

    await api.post('/api/console', 'say hello');

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.body).toBe('say hello');
    expect(init.headers['Content-Type']).toBe('text/plain');
  });

  it('api.put sends PUT request', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse(200, { updated: true }),
    );

    await api.put('/api/servers/1', { name: 'renamed' });

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.method).toBe('PUT');
  });

  it('api.patch sends PATCH request', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse(200, { patched: true }),
    );

    await api.patch('/api/servers/1', { description: 'updated' });

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.method).toBe('PATCH');
  });

  it('api.delete sends DELETE request', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse(204, ''),
    );

    await api.delete('/api/servers/1');

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.method).toBe('DELETE');
  });

  it('throws ApiError on non-ok response', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse(404, { errors: [{ code: 'NotFound', status: '404', detail: 'Not found' }] }),
    );

    await expect(api.get('/api/missing')).rejects.toThrow(ApiError);
  });

  it('returns undefined for 204 responses', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse(204, ''),
    );

    const result = await api.delete('/api/servers/1');
    expect(result).toBeUndefined();
  });

  it('sets X-Requested-With and Accept headers on every request', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse(200, {}),
    );

    await api.get('/api/test');

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.headers['X-Requested-With']).toBe('XMLHttpRequest');
    expect(init.headers['Accept']).toBe('application/json');
  });

  it('includes credentials: include', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse(200, {}),
    );

    await api.get('/api/test');

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.credentials).toBe('include');
  });
});
