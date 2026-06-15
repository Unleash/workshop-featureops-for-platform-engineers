import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Offline-first: the Unleash Developer Toolbar hardcodes its logo on the Unleash
// CDN. Rewrite that to a same-origin copy of the *same* Unleash mark (bundled in
// public/) so the toolbar keeps its normal icon while the demo never reaches out.
const offlineUnleashToolbarLogo = (): Plugin => {
  const CDN_LOGO = 'https://cdn.getunleash.io/docs-assets/unleash_logo_icon.svg';
  return {
    name: 'offline-unleash-toolbar-logo',
    transform(code, id) {
      if (id.includes('@unleash') && code.includes(CDN_LOGO)) {
        return { code: code.split(CDN_LOGO).join('/unleash-logo.svg'), map: null };
      }
      return null;
    },
  };
};

export default defineConfig({
  plugins: [react(), tailwindcss(), offlineUnleashToolbarLogo()],
  // Read the single root .env so VITE_* values are shared with the rest of the template.
  envDir: '../../../',
  // A distinct cache dir lets a second dev server (the production instance in `make dev`)
  // run from the same package without clobbering the development instance's cache.
  cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.vite',
  // Keep the toolbar out of dep pre-bundling so the rewrite above also applies in dev.
  optimizeDeps: { exclude: ['@unleash/toolbar'] },
  server: { port: 8080, host: true },
  preview: { port: 8080, host: true },
});
