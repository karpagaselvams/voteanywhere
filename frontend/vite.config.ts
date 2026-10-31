import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      // The frontend talks to /api on its own origin; Vite forwards to the
      // backend in development, so no CORS or env file is needed locally.
      '/api': 'http://localhost:4000',
    },
  },
});
