import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { themeIds, themeToCssVars } from './themeConfig';

function parseFallback() {
  const css = readFileSync(new URL('./themeFallback.css', import.meta.url), 'utf8');
  const vars = {};
  for (const [, name, value] of css.matchAll(/(--[\w-]+):\s*([^;]+);/g)) vars[name] = value.trim();
  return vars;
}

describe('theme CSS variables', () => {
  it('fallback CSS mirrors the Classic Indian theme exactly', () => {
    expect(parseFallback()).toEqual(themeToCssVars('classic-indian'));
  });

  it('every theme defines the same variable names', () => {
    const base = Object.keys(themeToCssVars('classic-indian')).sort();
    for (const id of themeIds) expect(Object.keys(themeToCssVars(id)).sort()).toEqual(base);
  });
});
