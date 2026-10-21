import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The whole game ships as one self-contained index.html: no assets, no external requests.
// base './' — Yandex Games serves the build from a nested path.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { target: 'es2019', chunkSizeWarningLimit: 2000 },
  server: { host: true },
});
