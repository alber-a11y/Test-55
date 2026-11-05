import { defineConfig } from 'vite';

// base './' — game portals serve the build from a nested path, so every asset URL must be relative.
export default defineConfig({
  base: './',
  build: { target: 'es2019', assetsInlineLimit: 0 },
  worker: { format: 'es' },
  server: { host: true },
  test: { include: ['tests/**/*.test.ts'] },
} as any);
