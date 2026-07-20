import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: resolveDevelopmentServer(),
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MuscleMap Fitness',
        short_name: 'MuscleMap',
        description: '从肌群理解动作，从动作建立训练计划，再记录训练执行',
        lang: 'zh-CN',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        theme_color: '#0f172a',
        background_color: '#020617',
        icons: [
          {
            src: '/icons/musclemap-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/musclemap-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,glb}'],
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ],
});

function resolveDevelopmentServer() {
  const keyPath = process.env.MUSCLEMAP_DEV_HTTPS_KEY_FILE;
  const certificatePath = process.env.MUSCLEMAP_DEV_HTTPS_CERT_FILE;
  if (!keyPath && !certificatePath) return undefined;
  if (!keyPath || !certificatePath) {
    throw new Error('Both MUSCLEMAP_DEV_HTTPS_KEY_FILE and MUSCLEMAP_DEV_HTTPS_CERT_FILE are required for HTTPS development.');
  }
  return { https: { key: readFileSync(keyPath), cert: readFileSync(certificatePath) } };
}
