import type { GameRouteId } from '@/router/routePaths'
import { GAME_ROUTE_PATHS } from '@/router/routePaths'

export interface HomeGameCard {
  id: GameRouteId
  label: string
  emoji: string
  path: (typeof GAME_ROUTE_PATHS)[GameRouteId]
  accent: 'coral' | 'teal' | 'amber'
}

export const HOME_GAME_CARDS: HomeGameCard[] = [
  {
    id: 'crocodile',
    label: 'Răng cá sấu',
    emoji: '🐊',
    path: GAME_ROUTE_PATHS.crocodile,
    accent: 'teal',
  },
  {
    id: 'mine',
    label: 'Bắt ếch',
    emoji: '🐸',
    path: GAME_ROUTE_PATHS.mine,
    accent: 'coral',
  },
  {
    id: 'wheel',
    label: 'Vòng quay',
    emoji: '🎡',
    path: GAME_ROUTE_PATHS.wheel,
    accent: 'amber',
  },
  {
    id: 'cards',
    label: 'Bốc bài',
    emoji: '🃏',
    path: GAME_ROUTE_PATHS.cards,
    accent: 'teal',
  },
]
