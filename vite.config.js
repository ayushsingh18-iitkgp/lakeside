import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true // <-- Allows external access (like from your proxy)
  },
  
  // This block is what the error message requested
  preview: {
    host: true, // Allows external access
    port: 4173, // Default preview port
    allowedHosts: ['prom.springfest.in']
  },

  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
});