import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAnonymousCartId, getAnonymousCartId, setAnonymousCartId } from './anonCartStorage';

const KEY = 'vh.cart.anonymousId';
const ID = '3f2b8c1e-aaaa-4bbb-8ccc-1234567890ab';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
    removeItem: (k) => { delete data[k]; },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('anonCartStorage', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: fakeStorage() });
    clearAnonymousCartId();
  });

  it('returns null when nothing is stored', () => {
    expect(getAnonymousCartId()).toBeNull();
  });

  it('stores and retrieves an id under the dedicated key', () => {
    expect(setAnonymousCartId(ID)).toBe(true);
    expect(window.localStorage.data[KEY]).toBe(ID);
    expect(getAnonymousCartId()).toBe(ID);
  });

  it('reads a previously persisted id after a reload (empty memory)', () => {
    window.localStorage.data[KEY] = ID;
    expect(getAnonymousCartId()).toBe(ID);
  });

  it('clear removes it everywhere', () => {
    setAnonymousCartId(ID);
    clearAnonymousCartId();
    expect(getAnonymousCartId()).toBeNull();
    expect(KEY in window.localStorage.data).toBe(false);
  });

  it('rejects invalid ids on set', () => {
    for (const bad of [null, undefined, 42, '', 'short', 'has space in it!!', 'a'.repeat(200), 'x\r\nInjected: 1']) {
      expect(setAnonymousCartId(bad)).toBe(false);
    }
    expect(getAnonymousCartId()).toBeNull();
  });

  it('discards an invalid stored value and removes it', () => {
    window.localStorage.data[KEY] = 'not a valid id!';
    expect(getAnonymousCartId()).toBeNull();
    expect(KEY in window.localStorage.data).toBe(false);
  });

  it('does not throw when storage throws, and keeps the id in memory', () => {
    const boom = () => { throw new Error('denied'); };
    vi.stubGlobal('window', { localStorage: { getItem: boom, setItem: boom, removeItem: boom } });
    expect(() => setAnonymousCartId(ID)).not.toThrow();
    expect(getAnonymousCartId()).toBe(ID);
    expect(() => clearAnonymousCartId()).not.toThrow();
    expect(getAnonymousCartId()).toBeNull();
  });

  it('does not throw when localStorage is inaccessible', () => {
    vi.stubGlobal('window', { get localStorage() { throw new Error('blocked'); } });
    expect(() => { clearAnonymousCartId(); getAnonymousCartId(); setAnonymousCartId(ID); }).not.toThrow();
  });
});
