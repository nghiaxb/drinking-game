import type { ManifestOptions } from 'vite-plugin-pwa'

import { PWA_BACKGROUND_COLOR, PWA_THEME_COLOR } from './visualTokens.ts'

type PwaManifestConfig = Pick<
  ManifestOptions,
  | 'name'
  | 'short_name'
  | 'description'
  | 'lang'
  | 'dir'
  | 'theme_color'
  | 'background_color'
  | 'display'
  | 'orientation'
  | 'scope'
  | 'start_url'
  | 'categories'
  | 'icons'
>

export const PWA_MANIFEST: PwaManifestConfig = {
  name: 'Drinking Games — Trò chơi nhậu offline',
  short_name: 'Drinking Games',
  description:
    'Năm mini game nhậu offline: Răng cá sấu, Bắt ếch, Vòng quay, Kéo cần và Bốc bài. Cài PWA và chơi không cần mạng.',
  lang: 'vi',
  dir: 'ltr',
  theme_color: PWA_THEME_COLOR,
  background_color: PWA_BACKGROUND_COLOR,
  display: 'standalone',
  orientation: 'portrait',
  scope: '/',
  start_url: '/',
  categories: ['games', 'entertainment'],
  icons: [
    {
      src: '/icons/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/icons/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
    },
    {
      src: '/icons/icon-maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: '/icons/apple-touch-icon.png',
      sizes: '180x180',
      type: 'image/png',
    },
  ],
}
