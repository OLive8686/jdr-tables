import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Handle SPA routing - redirect all routes to index.html
    historyApiFallback: true
  },
  preview: {
    port: 3000
  }
});
