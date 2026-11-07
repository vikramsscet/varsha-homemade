import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';
import { THEME_STORAGE_KEY } from '../themes/themeStorage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let api;
let listeners;
let store;
let root;
const Probe = () => { api = useTheme(); return null; };

function setup(initial = {}, suggestion) {
  store = { ...initial };
  listeners = {};
  root = { style: { props: {}, setProperty(k, v) { this.props[k] = v; } }, dataset: {} };
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    removeEventListener: (type) => { delete listeners[type]; },
  });
  vi.stubGlobal('document', { documentElement: root });
  let r;
  act(() => { r = TestRenderer.create(<ThemeProvider suggestion={suggestion}><Probe /></ThemeProvider>); });
  return r;
}
afterEach(() => vi.unstubAllGlobals());

describe('ThemeProvider', () => {
  it('initialises to Classic Indian and applies its variables to <html>', () => {
    setup();
    expect(api.currentTheme.id).toBe('classic-indian');
    expect(root.dataset.theme).toBe('classic-indian');
    expect(root.style.props['--color-primary']).toBe('#7A1F2B');
  });

  it('restores the saved theme on initialisation', () => {
    setup({ [THEME_STORAGE_KEY]: 'festive-vibrant' });
    expect(api.currentTheme.id).toBe('festive-vibrant');
    expect(root.dataset.theme).toBe('festive-vibrant');
    expect(root.style.props['--color-primary']).toBe('#B83227');
  });

  it('falls back to Classic Indian for an invalid saved id and does not rewrite it', () => {
    setup({ [THEME_STORAGE_KEY]: 'bogus' });
    expect(api.currentTheme.id).toBe('classic-indian');
    expect(root.dataset.theme).toBe('classic-indian');
  });

  it('switches themes without reload, updates every variable and persists', () => {
    setup();
    act(() => { expect(api.setTheme('modern-minimal')).toBe(true); });
    expect(api.currentTheme.id).toBe('modern-minimal');
    expect(root.dataset.theme).toBe('modern-minimal');
    expect(root.style.props['--color-primary']).toBe('#AE5535');
    expect(root.style.props['--radius-card']).toBe('8px');
    expect(store[THEME_STORAGE_KEY]).toBe('modern-minimal');
  });

  it('ignores an invalid id: keeps the theme, writes nothing', () => {
    setup({ [THEME_STORAGE_KEY]: 'festive-vibrant' });
    act(() => { expect(api.setTheme('bogus')).toBe(false); });
    expect(api.currentTheme.id).toBe('festive-vibrant');
    expect(store[THEME_STORAGE_KEY]).toBe('festive-vibrant');
  });

  it('follows a theme change made in another tab, and resets on a cleared/invalid value', () => {
    setup();
    act(() => listeners.storage({ key: THEME_STORAGE_KEY, newValue: 'modern-minimal' }));
    expect(api.currentTheme.id).toBe('modern-minimal');
    act(() => listeners.storage({ key: 'unrelated', newValue: 'festive-vibrant' }));
    expect(api.currentTheme.id).toBe('modern-minimal');
    act(() => listeners.storage({ key: THEME_STORAGE_KEY, newValue: null }));
    expect(api.currentTheme.id).toBe('classic-indian');
  });

  it('keeps stable references so consumers do not re-render needlessly', () => {
    setup();
    const { setTheme, availableThemes } = api;
    act(() => { api.setTheme('modern-minimal'); });
    expect(api.setTheme).toBe(setTheme);
    expect(api.availableThemes).toBe(availableThemes);
  });
});

describe('ThemeProvider campaign suggestion', () => {
  const festive = { themeId: 'festive-vibrant', force: false };

  it('applies the suggested theme for a customer with no saved choice, without persisting it', () => {
    setup({}, festive);
    expect(api.currentTheme.id).toBe('festive-vibrant');
    expect(THEME_STORAGE_KEY in store).toBe(false);
  });

  it("does not override a customer's saved theme", () => {
    setup({ [THEME_STORAGE_KEY]: 'modern-minimal' }, festive);
    expect(api.currentTheme.id).toBe('modern-minimal');
  });

  it('overrides a saved theme only when force is set, still without persisting', () => {
    setup({ [THEME_STORAGE_KEY]: 'modern-minimal' }, { ...festive, force: true });
    expect(api.currentTheme.id).toBe('festive-vibrant');
    expect(store[THEME_STORAGE_KEY]).toBe('modern-minimal');
  });

  it('ignores an unknown suggested id', () => {
    setup({}, { themeId: 'nope', force: true });
    expect(api.currentTheme.id).toBe('classic-indian');
  });
});
