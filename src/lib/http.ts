let onRequestStart: (() => void) | null = null;
let onRequestEnd: (() => void) | null = null;

export function setProgressCallbacks(start: () => void, end: () => void) {
  onRequestStart = start;
  onRequestEnd = end;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public errors: Array<{ code: string; status: string; detail: string }>,
  ) {
    super(errors[0]?.detail || `API error ${status}`);
    this.name = 'ApiError';
  }

  static async fromResponse(res: Response): Promise<ApiError> {
    let errors: Array<{ code: string; status: string; detail: string }> = [];
    let code = 'HttpError';
    try {
      const data = await res.json();
      if (data.errors && Array.isArray(data.errors)) {
        errors = data.errors;
        code = data.errors[0]?.code || code;
      } else if (data.error) {
        errors = [{ code: 'ServerError', status: String(res.status), detail: String(data.error) }];
      } else if (data.message) {
        errors = [{ code: 'ServerError', status: String(res.status), detail: String(data.message) }];
      }
    } catch {
      errors = [{ code: 'HttpError', status: String(res.status), detail: res.statusText || `HTTP ${res.status}` }];
    }
    if (!errors.length) {
      errors = [{ code: 'HttpError', status: String(res.status), detail: `HTTP ${res.status}` }];
    }
    return new ApiError(res.status, code, errors);
  }
}

export function httpErrorToHuman(error: unknown): string {
  if (error instanceof ApiError) {
    return error.errors[0]?.detail || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred.';
}

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  timeout?: number;
  responseType?: 'json' | 'text';
}

async function http<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, headers = {}, timeout = 20000, responseType = 'json' } = options;

  // Build URL with query params
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== '') {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }

  // Set up headers
  const reqHeaders: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
    ...headers,
  };

  // CSRF token for mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCookie('XSRF-TOKEN');
    if (csrfToken) {
      reqHeaders['X-XSRF-TOKEN'] = csrfToken;
    }
  }

  // Body handling
  let bodyContent: BodyInit | undefined;
  if (body !== undefined) {
    if (typeof body === 'string') {
      bodyContent = body;
      if (!reqHeaders['Content-Type']) {
        reqHeaders['Content-Type'] = 'text/plain';
      }
    } else {
      bodyContent = JSON.stringify(body);
      if (!reqHeaders['Content-Type']) {
        reqHeaders['Content-Type'] = 'application/json';
      }
    }
  }

  // Progress tracking
  const skipProgress = endpoint.endsWith('/resources');
  if (!skipProgress) onRequestStart?.();

  try {
    const res = await fetch(url, {
      method,
      headers: reqHeaders,
      body: bodyContent,
      credentials: 'include',
      signal: AbortSignal.timeout(timeout),
    });

    if (!res.ok) {
      throw await ApiError.fromResponse(res);
    }

    if (res.status === 204) return undefined as T;

    if (responseType === 'text') {
      return (await res.text()) as T;
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await res.json()) as T;
    }

    return (await res.text()) as T;
  } finally {
    if (!skipProgress) onRequestEnd?.();
  }
}

export const api = {
  get: <T = unknown>(url: string, params?: Record<string, string | number | boolean | undefined | null>) =>
    http<T>(url, { method: 'GET', params }),
  post: <T = unknown>(url: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    http<T>(url, { method: 'POST', body, ...options }),
  put: <T = unknown>(url: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    http<T>(url, { method: 'PUT', body, ...options }),
  patch: <T = unknown>(url: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    http<T>(url, { method: 'PATCH', body, ...options }),
  delete: <T = unknown>(url: string) =>
    http<T>(url, { method: 'DELETE' }),
};

export default http;
