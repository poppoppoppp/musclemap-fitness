import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

let privateModelDir = '';

export default defineConfig({
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}']
      }
    }),
    {
      name: 'exclude-private-models-from-build',
      apply: 'build',
      configResolved(config) {
        privateModelDir = resolve(config.root, config.build.outDir, 'models/private');
      },
      closeBundle() {
        if (privateModelDir) {
          rmSync(privateModelDir, { recursive: true, force: true });
        }
      }
    }
  ],
});
