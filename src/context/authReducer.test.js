import { beforeEach, describe, expect, it } from 'vitest';
import { authReducer, initialAuthState } from './authReducer';
import { tokenStorage } from '../services/tokenStorage';

const user = { id: '1', email: 'a@b.c' };

beforeEach(() => tokenStorage.clear());

describe('authReducer', () => {
  it('starts unauthenticated without a stored token', () => {
    expect(initialAuthState()).toMatchObject({ status: 'unauthenticated', token: null });
  });

  it('starts loading with a stored token (no logged-out flash)', () => {
    tokenStorage.set('tok');
    expect(initialAuthState()).toMatchObject({ status: 'loading', token: 'tok' });
  });

  it('loading -> authenticated on /me success', () => {
    tokenStorage.set('tok');
    const next = authReducer(initialAuthState(), { type: 'USER_LOADED', user });
    expect(next).toMatchObject({ status: 'authenticated', user, token: 'tok' });
  });

  it('loading -> unauthenticated on 401/404 sign-out', () => {
    tokenStorage.set('tok');
    expect(authReducer(initialAuthState(), { type: 'SIGNED_OUT' })).toMatchObject({
      status: 'unauthenticated', user: null, token: null,
    });
  });

  it('login then logout', () => {
    const s1 = authReducer(initialAuthState(), { type: 'LOGIN_SUCCESS', token: 't', user });
    expect(s1).toMatchObject({ status: 'authenticated', token: 't', user });
    expect(authReducer(s1, { type: 'SIGNED_OUT' }).status).toBe('unauthenticated');
  });

  it('transient failure records an error', () => {
    const s = authReducer(initialAuthState(), { type: 'FAILED', error: 'boom' });
    expect(s).toMatchObject({ status: 'unauthenticated', error: 'boom' });
  });
});
