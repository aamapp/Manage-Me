import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
      },
      plugins: [react(), cloudflare()],
      define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY && env.GEMINI_API_KEY !== "AI Studio Free Tier" ? env.GEMINI_API_KEY : (env.VITE_GEMINI_API_KEY || "")),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== "AI Studio Free Tier" ? env.GEMINI_API_KEY : ""))
    },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});