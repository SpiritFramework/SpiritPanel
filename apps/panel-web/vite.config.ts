import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { PANEL_CSP } from './csp.mjs';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Enable minification for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      mangle: true,
      output: {
        comments: false,
      },
    },
    // Code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          react: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'framer-motion', 'motion-dom'],
        },
      },
    },
    // Generate source maps for production debugging (gzipped separately)
    sourcemap: 'hidden',
    // Optimize chunk sizes
    chunkSizeWarningLimit: 600,
    // Generate manifest for asset tracking
    manifest: true,
    // Report compressed size
    reportCompressedSize: true,
  },
  server: {
    port: 5173,
    headers: {
      'Content-Security-Policy': PANEL_CSP,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
