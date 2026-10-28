import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// base './' — Yandex Games serves the build from a nested path, so all asset URLs must be relative.
export default defineConfig({
  root: here('.'),
  base: './',
  publicDir: false,
  resolve: { alias: { '@shared': here('../shared') } },
  build: {
    outDir: here('../dist/durak'),
    emptyOutDir: true,
    target: 'es2019',
    chunkSizeWarningLimit: 2000,
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } },
  },
  server: { host: true, port: 5182 },
  preview: { port: 5183 },
});
