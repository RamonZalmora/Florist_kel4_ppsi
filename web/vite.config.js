import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: {
    host: '127.0.0.1',
    port: Number(process.env.WEB_PORT || 3000),
    strictPort: true,
    open: process.env.OPEN_BROWSER === '1' ? '/catalog' : false,
    proxy: { '/api': `http://127.0.0.1:${process.env.API_PORT || 3001}` },
  },
});
