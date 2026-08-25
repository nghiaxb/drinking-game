import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa'
import { PRERENDER_PATHS } from './src/router/routePaths.ts'
import { PWA_MANIFEST } from './src/pwa/manifest.ts'
import {
  WORKBOX_NAVIGATE_FALLBACK,
  WORKBOX_NAVIGATE_FALLBACK_DENYLIST,
} from './src/pwa/workbox-config.ts'

export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    VitePWA({
      registerType: 'prompt',
      manifest: PWA_MANIFEST as ManifestOptions,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,mp3,wav,ogg,txt}'],
        navigateFallback: WORKBOX_NAVIGATE_FALLBACK,
        navigateFallbackDenylist: WORKBOX_NAVIGATE_FALLBACK_DENYLIST,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  ssgOptions: {
    script: 'async',
    formatting: 'minify',
    dirStyle: 'nested',
    includedRoutes() {
      return [...PRERENDER_PATHS]
    },
  },
})
