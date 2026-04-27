import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1800,
    emptyOutDir: true,
    outDir: 'dist/f1-simulator',
    rollupOptions: {
      input: 'src/f1-simulator/main.js',
      output: {
        entryFileNames: 'f1-simulator.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'f1-simulator.css';
          }
          return 'assets/[name][extname]';
        },
      },
    },
  },
});
