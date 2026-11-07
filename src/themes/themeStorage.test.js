import { afterEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, clearThemeId, loadThemeId, saveThemeId } from './themeStorage';

function stubStorage(initial = {}) {
  const data = { ...initial };
  const storage = {
    getItem: vi.fn((k) => (k in data ? data[k] : null)),
    setItem: vi.fn((k, v) => { data[k] = String(v); }),
    removeItem: vi.fn((k) => { delete data[k]; }),
  };
  vi.stubGlobal('window', { localStorage: storage });
  return { data, storage };
}
afterEach(() => vi.unstubAllGlobals());

describe('themeStorage', () => {
  it('defaults to Classic Indian when nothing is stored', () => {
    stubStorage();
    expect(loadThemeId()).toBe('classic-indian');
  });

  it('restores a valid saved theme', () => {
    stubStorage({ [THEME_STORAGE_KEY]: 'festive-vibrant' });
    expect(loadThemeId()).toBe('festive-vibrant');
  });

  it.each(['bogus', '', 'null', 'undefined', '__proto__', 'MODERN-MINIMAL'])('ignores a corrupt stored value %p', (v) => {
    stubStorage({ [THEME_STORAGE_KEY]: v });
    expect(loadThemeId()).toBe('classic-indian');
  });

  it('saves only valid ids', () => {
    const { data } = stubStorage();
    expect(saveThemeId('modern-minimal')).toBe(true);
    expect(data[THEME_STORAGE_KEY]).toBe('modern-minimal');
    expect(saveThemeId('bogus')).toBe(false);
    expect(data[THEME_STORAGE_KEY]).toBe('modern-minimal');
  });

  it('never throws when storage is unavailable or blocked', () => {
    vi.stubGlobal('window', { get localStorage() { throw new Error('blocked'); } });
    expect(loadThemeId()).toBe('classic-indian');
    expect(saveThemeId('modern-minimal')).toBe(false);
    expect(() => clearThemeId()).not.toThrow();
    vi.stubGlobal('window', { localStorage: { getItem() { throw new Error('boom'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('x'); } } });
    expect(loadThemeId()).toBe('classic-indian');
    expect(saveThemeId('festive-vibrant')).toBe(false);
    expect(() => clearThemeId()).not.toThrow();
  });

  it('works without a window at all (SSR / node)', () => {
    expect(loadThemeId()).toBe('classic-indian');
    expect(saveThemeId('modern-minimal')).toBe(false);
  });
});
