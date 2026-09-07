export type GameRouteId = 'crocodile' | 'mine' | 'wheel' | 'cards'

export const GAME_ROUTE_IDS = [
  'crocodile',
  'mine',
  'wheel',
  'cards',
] as const satisfies readonly GameRouteId[]

export const PRERENDER_PATHS = [
  '/',
  '/games/crocodile',
  '/games/mine',
  '/games/wheel',
  '/games/cards',
] as const

export type PrerenderPath = (typeof PRERENDER_PATHS)[number]

export const GAME_ROUTE_PATHS: Record<GameRouteId, `/games/${GameRouteId}`> = {
  crocodile: '/games/crocodile',
  mine: '/games/mine',
  wheel: '/games/wheel',
  cards: '/games/cards',
}
