// Shared defaults + helper so individual themes only declare what makes them different.

const BASE = {
  typography: {
    headingFont: "'Playfair Display', serif",
    bodyFont: "'DM Sans', sans-serif",
    fontWeights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  },
  design: {
    cardRadius: '16px',
    buttonRadius: '999px',
    inputRadius: '8px',
    spacing: '16px',
  },
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function merge(base, override) {
  const out = { ...base };
  for (const [key, value] of Object.entries(override ?? {})) {
    out[key] = isPlainObject(value) && isPlainObject(base[key]) ? merge(base[key], value) : value;
  }
  return out;
}

export function createTheme({ id, label, description = '', colors, typography, design }) {
  return {
    id,
    label,
    description,
    colors,
    typography: merge(BASE.typography, typography),
    design: merge(BASE.design, design),
  };
}
