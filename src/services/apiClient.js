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

// Accepts either "https://host" or "https://host/api/v1" and returns "https://host/api/v1"
// (no trailing slash, prefix never duplicated). Returns '' when unset.
export function resolveApiBase(raw) {
  const base = (raw ?? '').trim().replace(/\/+$/, '');
  if (!base) return '';
  return /\/api\/v1$/.test(base) ? base : `${base}/api/v1`;
}

// Caller headers win over defaults (case-insensitive), so an explicit Authorization is kept.
function applyHeaders(headers, extra) {
  for (const [name, value] of Object.entries(extra ?? {})) {
    if (value === undefined || value === null) continue;
    for (const existing of Object.keys(headers)) {
      if (existing.toLowerCase() === name.toLowerCase()) delete headers[existing];
    }
    headers[name] = value;
  }
}

// Options: headers (extra request headers), onResponse(response) (called on success, e.g. to read
// response headers), silent401 (skip the global unauthorized handler).
export async function request(
  baseUrl,
  path,
  { method = 'GET', body, silent401 = false, headers: extraHeaders, onResponse } = {}
) {
  if (!baseUrl) throw new ApiError({ code: 'NOT_CONFIGURED', message: 'API base URL is not configured' });

  const token = tokenStorage.get();
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  applyHeaders(headers, extraHeaders);

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
  onResponse?.(response);
  return payload.data;
}
