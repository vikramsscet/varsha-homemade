import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GuestCheckoutProvider, useGuestCheckout } from './GuestCheckoutContext';
import * as api from '../services/guestCheckoutApi';
import * as storage from '../services/guestCheckoutStorage';

vi.mock('../services/guestCheckoutApi', async (orig) => ({ ...(await orig()), deleteGuestSession: vi.fn() }));
vi.mock('../services/guestCheckoutStorage');

let ctx;
const Probe = () => { ctx = useGuestCheckout(); return null; };
const mount = () => act(async () => { TestRenderer.create(<GuestCheckoutProvider><Probe /></GuestCheckoutProvider>); });

beforeEach(() => { vi.clearAllMocks(); storage.getGuestSession.mockReturnValue({ sessionToken: 'T' }); });

describe('guest cleanup', () => {
  it('deletes the session remotely and clears local credentials', async () => {
    api.deleteGuestSession.mockResolvedValue();
    await mount();
    await act(async () => { await ctx.cleanup(); });
    expect(api.deleteGuestSession).toHaveBeenCalledTimes(1);
    expect(storage.clearGuestSession).toHaveBeenCalled();
  });

  it('still clears locally when the remote delete fails, without throwing or retrying', async () => {
    api.deleteGuestSession.mockRejectedValue(new Error('network'));
    await mount();
    await act(async () => { await ctx.cleanup(); });
    expect(api.deleteGuestSession).toHaveBeenCalledTimes(1);
    expect(storage.clearGuestSession).toHaveBeenCalled();
    expect(ctx.session).toBeNull();
  });

  it('skips the remote call when there is no session token', async () => {
    storage.getGuestSession.mockReturnValue(null);
    await mount();
    await act(async () => { await ctx.cleanup(); });
    expect(api.deleteGuestSession).not.toHaveBeenCalled();
  });
});
