import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './addressApi';
import { getFieldErrors } from './apiErrors';
import { tokenStorage } from './tokenStorage';

const res = (status, body) => ({ ok: status < 400, status, json: async () => body, headers: { get: () => null } });
const ok = (data) => res(200, { success: true, data, message: '' });
const fail = (status, code, message = 'm', details) => res(status, { success: false, error: { code, message, details } });
const addr = { firstName: 'V', lastName: 'R', phone: '+918319510666', country: 'India', addressLine1: 'x', city: 'Pune', state: 'MH', postalCode: '411057', isDefault: true };
let f;
beforeEach(() => {
  vi.stubEnv('VITE_USER_SERVICE_URL', 'http://api.test');
  tokenStorage.set('jwt');
  f = vi.fn();
  vi.stubGlobal('fetch', f);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  tokenStorage.clear();
});
const call = (i = 0) => ({ url: f.mock.calls[i][0], ...f.mock.calls[i][1] });

describe('addressApi', () => {
  it('retrieves addresses', async () => {
    f.mockResolvedValue(ok([{ id: '1' }]));
    expect(await api.getAddresses()).toEqual([{ id: '1' }]);
    expect(call()).toMatchObject({ url: 'http://api.test/api/v1/addresses', method: 'GET' });
  });
  it('creates, sending only documented fields (never a user id)', async () => {
    f.mockResolvedValue(ok({ id: '1' }));
    await api.createAddress({ ...addr, userId: 'u1', id: 'z' });
    expect(call().method).toBe('POST');
    expect(JSON.parse(call().body)).toEqual(addr);
  });
  it('updates with PUT, deletes, sets default, gets one', async () => {
    f.mockResolvedValue(ok({}));
    await api.updateAddress('a b', addr);
    await api.deleteAddress('1');
    await api.setDefaultAddress('1');
    await api.getAddress('1');
    expect(f.mock.calls.map((c) => [c[1].method, c[0]])).toEqual([
      ['PUT', 'http://api.test/api/v1/addresses/a%20b'],
      ['DELETE', 'http://api.test/api/v1/addresses/1'],
      ['PATCH', 'http://api.test/api/v1/addresses/1/default'],
      ['GET', 'http://api.test/api/v1/addresses/1'],
    ]);
  });
  it('always uses the JWT and never a guest/anonymous credential', async () => {
    f.mockResolvedValue(ok([]));
    await api.getAddresses();
    const h = call().headers;
    expect(h.Authorization).toBe('Bearer jwt');
    expect(Object.keys(h).join()).not.toMatch(/guest|anonymous/i);
  });
  it('rejects locally with UNAUTHORIZED when signed out, without a request', async () => {
    tokenStorage.clear();
    await expect(api.getAddresses()).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    expect(f).not.toHaveBeenCalled();
  });
  it('preserves validation errors and maps them to fields', async () => {
    f.mockResolvedValue(fail(400, 'INVALID_REQUEST', 'bad', [{ field: 'firstName', message: 'First name is required' }]));
    const e = await api.createAddress(addr).catch((x) => x);
    expect(e).toMatchObject({ status: 400, code: 'INVALID_REQUEST', message: 'bad' });
    expect(getFieldErrors(e)).toEqual({ firstName: 'First name is required' });
  });
  it('handles 401 from the server', async () => {
    f.mockResolvedValue(fail(401, 'UNAUTHORIZED'));
    await expect(api.getAddresses()).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
  });
  it('handles the address limit and not-found', async () => {
    f.mockResolvedValue(fail(409, 'ADDRESS_LIMIT_REACHED'));
    await expect(api.createAddress(addr)).rejects.toMatchObject({ code: 'ADDRESS_LIMIT_REACHED' });
    f.mockResolvedValue(fail(404, 'ADDRESS_NOT_FOUND'));
    await expect(api.getAddress('x')).rejects.toMatchObject({ code: 'ADDRESS_NOT_FOUND' });
  });
  it('handles 500 and network errors', async () => {
    f.mockResolvedValue(fail(500, 'INTERNAL_ERROR'));
    await expect(api.getAddresses()).rejects.toMatchObject({ status: 500, code: 'INTERNAL_ERROR' });
    f.mockRejectedValue(new Error('down'));
    await expect(api.getAddresses()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
  it('validateAddress flags bad fields and accepts a good one', () => {
    expect(api.validateAddress(addr)).toEqual({});
    expect(Object.keys(api.validateAddress({ ...addr, firstName: ' ', phone: 'abc', postalCode: '1' }))).toEqual(['firstName', 'phone', 'postalCode']);
  });
});
