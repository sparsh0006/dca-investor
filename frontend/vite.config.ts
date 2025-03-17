import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from "@bangjelkoski/vite-plugin-node-polyfills";
import { Buffer } from 'buffer';

// Polyfill Buffer for browser environment
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}


export default defineConfig({
  plugins: [react(), nodePolyfills({ protocolImports: true })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api/lcd': {
        target: 'https://testnet.lcd.injective.network',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/lcd/, ''),
        secure: false,
      },
    },
  },
});
