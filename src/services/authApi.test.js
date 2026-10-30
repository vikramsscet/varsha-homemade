import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuthErrorMessage, getMe, loginWithGoogle } from './authApi';
import { ApiError, setUnauthorizedHandler } from './apiClient';
import { tokenStorage } from './tokenStorage';

const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
const fail = (status, code, message = 'x') => json(status, { success: false, error: { code, message } });
const user = { id: '1', email: 'a@b.c' };
const GENERIC = 'Something went wrong. Please try again.';

beforeEach(() => {
  vi.stubEnv('VITE_USER_SERVICE_URL', 'http://api.test/api/v1');
  tokenStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
});

describe('loginWithGoogle', () => {
  it('posts the credential and returns data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { success: true, data: { token: 't', user }, message: '' }));
    vi.stubGlobal('fetch', fetchMock);
    const data = await loginWithGoogle('cred');
    expect(data.token).toBe('t');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/v1/auth/google');
    expect(JSON.parse(init.body)).toEqual({ credential: 'cred' });
    expect(init.headers.Authorization).toBeUndefined();
  });

  it.each([
    [401, 'INVALID_GOOGLE_CREDENTIAL', 'Sign-in failed, please try again.'],
    [401, 'EMAIL_NOT_VERIFIED', 'Please verify your Google email address and try again.'],
    [403, 'ACCOUNT_DISABLED', 'Your account is disabled. Please contact support.'],
    [409, 'ACCOUNT_CONFLICT', 'This email is linked to a different Google account.'],
    [429, 'RATE_LIMITED', 'Too many attempts. Please try again later.'],
    [400, 'INVALID_REQUEST', GENERIC],
    [403, 'CORS_FORBIDDEN', GENERIC],
    [413, 'PAYLOAD_TOO_LARGE', GENERIC],
    [500, 'INTERNAL_ERROR', GENERIC],
  ])('%i %s maps to its message', async (status, code, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fail(status, code)));
    const err = await loginWithGoogle('cred').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status, code });
    expect(getAuthErrorMessage(err)).toBe(message);
  });

  it('normalizes network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const err = await loginWithGoogle('cred').catch((e) => e);
    expect(err).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect(getAuthErrorMessage(err)).toBe(GENERIC);
  });

  it('never logs the credential', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fail(400, 'INVALID_REQUEST')));
    const err = await loginWithGoogle('secret-credential').catch((e) => e);
    getAuthErrorMessage(err);
    expect(JSON.stringify(console.error.mock.calls)).not.toContain('secret-credential');
  });
});

describe('getMe', () => {
  it('sends the Bearer token and returns the user', async () => {
    tokenStorage.set('tok');
    const fetchMock = vi.fn().mockResolvedValue(json(200, { success: true, data: user, message: '' }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getMe()).toEqual(user);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });

  it('401 triggers the global unauthorized handler', async () => {
    tokenStorage.set('tok');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fail(401, 'UNAUTHORIZED', 'Token expired')));
    await expect(getMe()).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('silent401 skips the handler', async () => {
    tokenStorage.set('tok');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fail(401, 'UNAUTHORIZED')));
    await expect(getMe({ silent401: true })).rejects.toMatchObject({ status: 401 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('404 USER_NOT_FOUND is surfaced', async () => {
    tokenStorage.set('tok');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fail(404, 'USER_NOT_FOUND')));
    await expect(getMe()).rejects.toMatchObject({ status: 404, code: 'USER_NOT_FOUND' });
  });
});
