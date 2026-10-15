import { defineConfig } from 'vite';

// base './' — Yandex Games serves the build from a nested path, so all asset URLs must be relative.
export default defineConfig({
  base: './',
  build: {
    target: 'es2019',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'] } },
    },
  },
  server: { host: true },
});
