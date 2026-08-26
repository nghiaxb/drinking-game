import type { RouteRecordRaw } from 'vue-router'

import {
  GAME_ROUTE_PATHS,
  PRERENDER_PATHS,
  type GameRouteId,
  type PrerenderPath,
} from './routePaths'

export type { GameRouteId, PrerenderPath }
export { GAME_ROUTE_PATHS, PRERENDER_PATHS }

export type JsonLdSchemaType = 'WebApplication' | 'VideoGame'

export interface RouteSeoMeta {
  title: string
  description: string
  ogTitle: string
  ogDescription: string
  ogImage: string
  jsonLdType: JsonLdSchemaType
}

export interface AppRouteDefinition {
  path: string
  name: string
  gameId?: GameRouteId
  seo?: RouteSeoMeta
  noIndex?: boolean
  component: () => Promise<{ default: unknown }>
}

const APP_SEO = {
  home: {
    title: 'Drinking Games — Trò chơi nhậu offline',
    description:
      'Bộ sưu tập mini game nhậu offline: Răng cá sấu, Bắt ếch, Vòng quay, Kéo cần và Bốc bài. Chơi ngay trên web hoặc cài PWA.',
    ogTitle: 'Drinking Games — Chơi offline mọi lúc',
    ogDescription:
      'Năm trò chơi nhậu vui nhộn, tối ưu mobile, cài đặt như app và chơi offline sau lần tải đầu.',
    ogImage: '/og/og-home.png',
    jsonLdType: 'WebApplication' as const,
  },
  crocodile: {
    title: 'Răng cá sấu — Drinking Games',
    description:
      'Mini game Răng cá sấu: chọn răng an toàn, tránh cá sấu cắn và uống theo luật nhóm.',
    ogTitle: 'Răng cá sấu — Mini game nhậu',
    ogDescription: 'Thử vận may với hàm cá sấu. Chạm đúng răng bẫy sẽ phải uống!',
    ogImage: '/og/og-crocodile.png',
    jsonLdType: 'VideoGame' as const,
  },
  mine: {
    title: 'Bắt ếch — Drinking Games',
    description:
      'Mini game Bắt ếch: bắt ếch an toàn trên lưới 5x5, tránh ếch phạt và uống khi trúng.',
    ogTitle: 'Bắt ếch — Mini game nhậu',
    ogDescription: 'Bắt ếch cẩn thận — gặp ếch khóc là uống ngay.',
    ogImage: '/og/og-mine.png',
    jsonLdType: 'VideoGame' as const,
  },
  wheel: {
    title: 'Vòng quay — Drinking Games',
    description: 'Mini game Vòng quay: quay để chọn thử thách hoặc người uống ngẫu nhiên.',
    ogTitle: 'Vòng quay — Mini game nhậu',
    ogDescription: 'Tùy chỉnh danh sách và quay vòng may rủi cho cả nhóm.',
    ogImage: '/og/og-wheel.png',
    jsonLdType: 'VideoGame' as const,
  },
  slot: {
    title: 'Kéo cần — Drinking Games',
    description: 'Mini game Kéo cần: quay ba guồng, nhận phần thưởng hoặc thử thách uống.',
    ogTitle: 'Kéo cần — Mini game nhậu',
    ogDescription: 'Kéo cần may mắn với hiệu ứng reel và phần thưởng bất ngờ.',
    ogImage: '/og/og-slot.png',
    jsonLdType: 'VideoGame' as const,
  },
  cards: {
    title: 'Bốc bài — Drinking Games',
    description: 'Mini game Bốc bài: rút Truth, Dare và thẻ uống với bộ bài phong phú.',
    ogTitle: 'Bốc bài — Mini game nhậu',
    ogDescription: 'Bốc bài, lật thẻ và làm theo thử thách cùng bạn bè.',
    ogImage: '/og/og-cards.png',
    jsonLdType: 'VideoGame' as const,
  },
  settings: {
    title: 'Cài đặt — Drinking Games',
    description: 'Cài đặt âm thanh, rung và quản lý dữ liệu cục bộ.',
    ogTitle: 'Cài đặt — Drinking Games',
    ogDescription: 'Tuỳ chỉnh phản hồi và reset dữ liệu game.',
    ogImage: '/og/og-home.png',
    jsonLdType: 'WebApplication' as const,
  },
  notFound: {
    title: 'Không tìm thấy — Drinking Games',
    description: 'Trang không tồn tại.',
    ogTitle: 'Không tìm thấy — Drinking Games',
    ogDescription: 'Trang không tồn tại.',
    ogImage: '/og/og-home.png',
    jsonLdType: 'WebApplication' as const,
  },
} satisfies Record<string, RouteSeoMeta>

export const APP_ROUTES: AppRouteDefinition[] = [
  {
    path: '/',
    name: 'home',
    seo: APP_SEO.home,
    component: () => import('@/app/views/HomeView.vue'),
  },
  {
    path: GAME_ROUTE_PATHS.crocodile,
    name: 'game-crocodile',
    gameId: 'crocodile',
    seo: APP_SEO.crocodile,
    component: () => import('@/games/crocodile/CrocodileView.vue'),
  },
  {
    path: GAME_ROUTE_PATHS.mine,
    name: 'game-mine',
    gameId: 'mine',
    seo: APP_SEO.mine,
    component: () => import('@/games/mine/MineView.vue'),
  },
  {
    path: GAME_ROUTE_PATHS.wheel,
    name: 'game-wheel',
    gameId: 'wheel',
    seo: APP_SEO.wheel,
    component: () => import('@/games/wheel/WheelView.vue'),
  },
  {
    path: GAME_ROUTE_PATHS.slot,
    name: 'game-slot',
    gameId: 'slot',
    seo: APP_SEO.slot,
    component: () => import('@/games/slot/SlotView.vue'),
  },
  {
    path: GAME_ROUTE_PATHS.cards,
    name: 'game-cards',
    gameId: 'cards',
    seo: APP_SEO.cards,
    component: () => import('@/games/cards/CardsView.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    seo: APP_SEO.settings,
    noIndex: true,
    component: () => import('@/app/views/SettingsView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    seo: APP_SEO.notFound,
    noIndex: true,
    component: () => import('@/app/views/NotFoundView.vue'),
  },
]

export function getRouteByPath(path: string): AppRouteDefinition | undefined {
  const exact = APP_ROUTES.find((route) => route.path === path)
  if (exact) {
    return exact
  }

  const isKnownPublicPath = (PRERENDER_PATHS as readonly string[]).includes(path)
  if (!isKnownPublicPath) {
    return APP_ROUTES.find((route) => route.name === 'not-found')
  }

  return undefined
}

export function createRouterRoutes(): RouteRecordRaw[] {
  return APP_ROUTES.map((route) => ({
    path: route.path,
    name: route.name,
    component: route.component,
    meta: {
      seo: route.seo,
      gameId: route.gameId,
    },
  }))
}
