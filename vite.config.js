import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { brandIdentity } from './src/branding/brandIdentity.js';

const escapeAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// Injects document metadata from the central brand config into index.html.
function brandHtml() {
  const values = {
    '%BRAND_TITLE%': escapeAttr(brandIdentity.documentTitle),
    '%BRAND_DESCRIPTION%': escapeAttr(brandIdentity.description),
    '%BRAND_FAVICON%': escapeAttr(brandIdentity.faviconUrl),
  };
  return {
    name: 'brand-html',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => Object.entries(values).reduce((h, [k, v]) => h.split(k).join(v), html),
    },
  };
}

export default defineConfig({
  plugins: [react(), brandHtml()],
  server: {
    allowedHosts: ['varsha-homemade.onrender.com'],
    host: '0.0.0.0',
    port: 5174,
  },
});
