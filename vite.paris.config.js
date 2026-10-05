import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';
import { parisCspCompatibility } from './build/paris-csp.mjs';
import { copyFileSync } from 'node:fs';
export default defineConfig({
  plugins: [
    parisCspCompatibility(),
    cesium({ rebuildCesium: true }),
    {
      name: 'paris-entry',
      writeBundle() {
        copyFileSync('dist/paris.html', 'dist/index.html');
      },
    },
  ],
  publicDir: 'public/paris',
  build: {
    rollupOptions: { input: 'paris.html' },
    sourcemap: false,
    outDir: 'dist',
  },
  server: { host: '127.0.0.1' },
});
