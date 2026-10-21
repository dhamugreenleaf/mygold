import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'mygold.greenleafagencies.com',
      '.greenleafagencies.com',
      'mygold.gldatacenter.com',
      '.gldatacenter.com',
    ],
    hmr: {
      overlay: true,
    },
  },
});
