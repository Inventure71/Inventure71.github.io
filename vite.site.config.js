import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist/site',
    emptyOutDir: true,
    rollupOptions: {
      input: 'js/playfolio.js',
      output: {
        entryFileNames: 'playfolio.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
});
