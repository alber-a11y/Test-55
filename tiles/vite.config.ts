import { defineConfig } from 'vite';

// base './' — game portals serve builds from nested paths, so all asset URLs must be relative.
export default defineConfig({
  base: './',
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'] } },
    },
  },
  server: { host: true },
});
