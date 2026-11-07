// Central theme registry. To add a theme: create themes/<name>.js with createTheme(...)
// and append it to THEME_LIST below. Nothing else needs to change.
import classicIndian from './themes/classicIndian';
import modernMinimal from './themes/modernMinimal';
import festiveVibrant from './themes/festiveVibrant';

export const DEFAULT_THEME_ID = classicIndian.id;

const THEME_LIST = [classicIndian, modernMinimal, festiveVibrant];

export const themes = Object.freeze(Object.fromEntries(THEME_LIST.map((t) => [t.id, t])));
export const themeIds = Object.freeze(THEME_LIST.map((t) => t.id));

export function isValidThemeId(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(themes, id);
}

/** Returns a valid theme id, falling back to Classic Indian. */
export function resolveThemeId(id) {
  return isValidThemeId(id) ? id : DEFAULT_THEME_ID;
}

export function getTheme(id) {
  return themes[resolveThemeId(id)];
}

export function getThemeOptions() {
  return THEME_LIST.map(({ id, label, description, colors }) => ({
    id,
    label,
    description,
    swatches: [colors.primary, colors.secondary, colors.background],
  }));
}

// Theme keys whose CSS variable name differs from the kebab-cased key.
const CSS_COLOR_NAMES = { mutedText: 'muted' };

const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Flattens a theme into CSS custom properties, e.g. { '--color-primary-hover': '#...' }. */
export function themeToCssVars(themeOrId) {
  const theme = typeof themeOrId === 'string' ? getTheme(themeOrId) : themeOrId;
  const { colors, typography, design } = theme;
  const vars = {};
  for (const [k, v] of Object.entries(colors)) vars[`--color-${CSS_COLOR_NAMES[k] ?? kebab(k)}`] = v;
  vars['--font-heading'] = typography.headingFont;
  vars['--font-body'] = typography.bodyFont;
  for (const [k, v] of Object.entries(typography.fontWeights)) vars[`--font-weight-${k}`] = String(v);
  vars['--radius-card'] = design.cardRadius;
  vars['--radius-panel'] = design.panelRadius;
  vars['--radius-action'] = design.actionButtonRadius;
  vars['--radius-button'] = design.buttonRadius;
  vars['--radius-input'] = design.inputRadius;
  vars['--spacing-default'] = design.spacing;
  for (const [k, v] of Object.entries(design.shadows)) vars[`--shadow-${k}`] = v;
  vars['--shadow-card'] = design.shadows.md;
  return vars;
}
