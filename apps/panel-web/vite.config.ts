import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const monorepoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
const panelVersion = JSON.parse(readFileSync(path.join(monorepoRoot, 'package.json'), 'utf8')).version as string;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __PANEL_VERSION__: JSON.stringify(panelVersion),
  },
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
    // hmr:false skips the inline React Refresh <script type="module"> preamble.
    // That preamble is blocked by production CSP (and by any cached copy of it),
    // which white-screens local login. File changes still trigger a full reload.
    // Do not set Content-Security-Policy here — production CSP is nginx-only.
    hmr: false,
    headers: {
      'Cache-Control': 'no-store',
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
