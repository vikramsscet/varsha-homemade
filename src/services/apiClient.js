import { tokenStorage } from './tokenStorage';

export class ApiError extends Error {
  constructor({ status = 0, code = 'NETWORK_ERROR', message = 'Request failed', details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let unauthorizedHandler = null;

// The auth provider registers a callback that clears auth state and redirects to login.
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export async function request(baseUrl, path, { method = 'GET', body, silent401 = false } = {}) {
  if (!baseUrl) throw new ApiError({ code: 'NOT_CONFIGURED', message: 'API base URL is not configured' });

  const token = tokenStorage.get();
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError({ message: 'Network request failed' });
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // non-JSON body; handled below
  }

  if (!response.ok || payload?.success === false) {
    const error = new ApiError({
      status: response.status,
      code: payload?.error?.code ?? 'UNKNOWN_ERROR',
      message: payload?.error?.message ?? `Request failed with status ${response.status}`,
      details: payload?.error?.details,
    });
    // Only an authenticated call that comes back 401 means our session is dead.
    if (response.status === 401 && token && !silent401) unauthorizedHandler?.(error);
    throw error;
  }

  if (!payload || payload.success !== true) {
    throw new ApiError({ status: response.status, code: 'BAD_RESPONSE', message: 'Unexpected response' });
  }
  return payload.data;
}
