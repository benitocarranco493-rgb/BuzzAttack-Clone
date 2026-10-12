import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Mostrar host por defecto para acceder desde móviles en LAN y proxy
// hacia el servidor de la api/sockets (puerto 3000).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', changeOrigin: true, ws: true },
    },
  },
  build: {
    outDir: 'dist',
  },
});
