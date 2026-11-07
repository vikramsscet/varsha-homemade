import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, getTheme, getThemeOptions, isValidThemeId, resolveThemeId, themeIds, themes, themeToCssVars } from './themeConfig';

const REQUIRED_COLORS = ['primary', 'primaryHover', 'secondary', 'accent', 'background', 'surface', 'text', 'mutedText', 'border', 'success', 'warning', 'error'];

describe('theme registry', () => {
  it('registers the three themes with Classic Indian as the default', () => {
    expect(themeIds).toEqual(['classic-indian', 'modern-minimal', 'festive-vibrant']);
    expect(DEFAULT_THEME_ID).toBe('classic-indian');
  });

  it.each([null, undefined, '', 'bogus', 'CLASSIC-INDIAN', '__proto__', 'constructor', 42, {}, []])('rejects invalid id %p and falls back to Classic Indian', (id) => {
    expect(isValidThemeId(id)).toBe(false);
    expect(resolveThemeId(id)).toBe('classic-indian');
    expect(getTheme(id).id).toBe('classic-indian');
  });

  it('every theme defines the full colour, typography and design contract', () => {
    for (const id of themeIds) {
      const t = themes[id];
      for (const c of REQUIRED_COLORS) expect(t.colors[c], `${id}.colors.${c}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(t.typography.headingFont).toBeTruthy();
      expect(t.typography.bodyFont).toBeTruthy();
      expect(Object.keys(t.typography.fontWeights)).toEqual(expect.arrayContaining(['normal', 'medium', 'semibold', 'bold']));
      for (const k of ['cardRadius', 'buttonRadius', 'inputRadius', 'panelRadius', 'actionButtonRadius', 'spacing', 'buttonStyle']) expect(t.design[k], `${id}.${k}`).toBeTruthy();
      expect(Object.keys(t.design.shadows)).toEqual(expect.arrayContaining(['sm', 'md', 'lg', 'dropdown']));
    }
  });

  it('uses the specified primary/secondary/background/surface/text palettes', () => {
    const pick = (id) => ['primary', 'secondary', 'background', 'surface', 'text'].map((k) => themes[id].colors[k]);
    expect(pick('classic-indian')).toEqual(['#7A1F2B', '#C9A227', '#FFF8F0', '#FFFFFF', '#3D2B1F']);
    expect(pick('festive-vibrant')).toEqual(['#B83227', '#F2A900', '#FFF9EC', '#FFFFFF', '#422B20']);
    // Modern Minimal deliberately deepens the suggested primary (#C46A45) for WCAG AA.
    expect(pick('modern-minimal')).toEqual(['#AE5535', '#87977B', '#FAF9F6', '#FFFFFF', '#292929']);
    expect(themes['modern-minimal'].colors.accent).toBe('#C46A45');
  });

  it('exposes picker options with a name and three swatches', () => {
    const options = getThemeOptions();
    expect(options.map((o) => o.label)).toEqual(['Classic Indian', 'Modern Minimal', 'Festive & Vibrant']);
    options.forEach((o) => expect(o.swatches).toHaveLength(3));
  });

  it('emits CSS variables that are all non-empty and identical in name across themes', () => {
    const base = Object.keys(themeToCssVars('classic-indian')).sort();
    for (const id of themeIds) {
      const vars = themeToCssVars(id);
      expect(Object.keys(vars).sort()).toEqual(base);
      Object.entries(vars).forEach(([name, value]) => expect(String(value).trim(), name).not.toBe(''));
    }
  });
});
