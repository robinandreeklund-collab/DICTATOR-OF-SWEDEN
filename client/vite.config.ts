import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Klienten byggs till ../server/public sa servern kan servera den.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
