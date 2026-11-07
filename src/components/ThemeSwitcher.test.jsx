import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import ThemeSwitcher from './ThemeSwitcher';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let themeApi;
const Probe = () => { themeApi = useTheme(); return null; };

function render() {
  let r;
  act(() => {
    r = TestRenderer.create(<ThemeProvider><ThemeSwitcher /><Probe /></ThemeProvider>);
  });
  return r;
}
const hosts = (r, pred) => r.root.findAll((n) => typeof n.type === 'string' && pred(n.props));
const trigger = (r) => hosts(r, (p) => p.className === 'theme-trigger')[0];
const options = (r) => hosts(r, (p) => p.role === 'menuitemradio');
const menu = (r) => hosts(r, (p) => p.role === 'menu');
const text = (node) => node.children.map((c) => (typeof c === 'string' ? c : text(c))).join('');

beforeEach(() => {
  vi.stubGlobal('document', { addEventListener() {}, removeEventListener() {}, activeElement: null });
});
afterEach(() => vi.unstubAllGlobals());

describe('ThemeSwitcher', () => {
  it('has an accessible trigger and no menu until opened', () => {
    const r = render();
    expect(trigger(r).props['aria-label']).toBe('Change website theme');
    expect(trigger(r).props['aria-expanded']).toBe(false);
    expect(menu(r)).toHaveLength(0);
  });

  it('lists every theme by name with one marked as checked (Classic Indian by default)', () => {
    const r = render();
    act(() => trigger(r).props.onClick());
    const items = options(r);
    expect(items.map(text)).toEqual(['Classic Indian', 'Modern Minimal', 'Festive & Vibrant']);
    expect(items.map((i) => i.props['aria-checked'])).toEqual([true, false, false]);
    expect(trigger(r).props['aria-expanded']).toBe(true);
  });

  it('shows a three-colour preview for each theme', () => {
    const r = render();
    act(() => trigger(r).props.onClick());
    const swatches = hosts(r, (p) => p.className === 'theme-swatches');
    expect(swatches).toHaveLength(3);
    swatches.forEach((s) => expect(s.findAllByType('i')).toHaveLength(3));
  });

  it('applies the chosen theme immediately and closes the menu', () => {
    const r = render();
    act(() => trigger(r).props.onClick());
    act(() => options(r)[2].props.onClick());
    expect(themeApi.currentTheme.id).toBe('festive-vibrant');
    expect(menu(r)).toHaveLength(0);
    act(() => trigger(r).props.onClick());
    expect(options(r).map((i) => i.props['aria-checked'])).toEqual([false, false, true]);
  });
});
