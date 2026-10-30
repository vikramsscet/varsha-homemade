import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request, resolveApiBase, setUnauthorizedHandler } from './apiClient';
import { tokenStorage } from './tokenStorage';

const res = (status, body, headers = {}) => ({
  ok: status < 400,
  status,
  json: async () => body,
  headers: { get: (n) => headers[n] ?? null },
});
const ok = (data = {}) => res(200, { success: true, data, message: '' });
const BASE = 'http://api.test/api/v1';

beforeEach(() => tokenStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
});

describe('resolveApiBase', () => {
  it.each([
    ['http://h', 'http://h/api/v1'],
    ['http://h/', 'http://h/api/v1'],
    ['http://h/api/v1', 'http://h/api/v1'],
    ['http://h/api/v1/', 'http://h/api/v1'],
    ['', ''],
    [undefined, ''],
  ])('%s -> %s', (raw, expected) => expect(resolveApiBase(raw)).toBe(expected));
});

describe('request headers', () => {
  it('keeps defaults and adds extra headers', async () => {
    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', f);
    await request(BASE, '/x', { method: 'POST', body: { a: 1 }, headers: { 'X-Test': 'v' } });
    expect(f.mock.calls[0][1].headers).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Test': 'v',
    });
  });

  it('still attaches the stored Bearer token by default', async () => {
    tokenStorage.set('tok');
    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', f);
    await request(BASE, '/x', { headers: { 'X-Test': 'v' } });
    expect(f.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });

  it('an explicit Authorization overrides the default, case-insensitively, with no duplicate', async () => {
    tokenStorage.set('tok');
    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', f);
    await request(BASE, '/x', { headers: { authorization: 'Bearer explicit' } });
    const headers = f.mock.calls[0][1].headers;
    expect(Object.keys(headers).filter((k) => k.toLowerCase() === 'authorization')).toEqual(['authorization']);
    expect(headers.authorization).toBe('Bearer explicit');
  });

  it('skips null/undefined extra headers', async () => {
    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', f);
    await request(BASE, '/x', { headers: { 'X-A': undefined, 'X-B': null } });
    expect(f.mock.calls[0][1].headers).toEqual({ Accept: 'application/json' });
  });

  it('sends no body or Content-Type when there is no body', async () => {
    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', f);
    await request(BASE, '/x', { method: 'POST' });
    expect(f.mock.calls[0][1].body).toBeUndefined();
    expect(f.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
  });
});

describe('request responses', () => {
  it('returns unwrapped data and exposes the response via onResponse', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(201, { success: true, data: { id: 1 } }, { 'X-H': 'h' })));
    let seen;
    const data = await request(BASE, '/x', { onResponse: (r) => (seen = r.headers.get('X-H')) });
    expect(data).toEqual({ id: 1 });
    expect(seen).toBe('h');
  });

  it('keeps status, code, message and details on errors', async () => {
    const body = { success: false, error: { code: 'QUANTITY_LIMIT_EXCEEDED', message: 'too many', details: [{ field: 'quantity', message: 'max 99' }] } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(422, body)));
    const err = await request(BASE, '/x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 422, code: 'QUANTITY_LIMIT_EXCEEDED', message: 'too many', details: body.error.details });
  });

  it('global 401 handler fires only when a token exists, and not when silent', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'x' } })));
    await request(BASE, '/x').catch(() => {});
    expect(handler).not.toHaveBeenCalled();
    tokenStorage.set('tok');
    await request(BASE, '/x', { silent401: true }).catch(() => {});
    expect(handler).not.toHaveBeenCalled();
    await request(BASE, '/x').catch(() => {});
    expect(handler).toHaveBeenCalledOnce();
  });
});
