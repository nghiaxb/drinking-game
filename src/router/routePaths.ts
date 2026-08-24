export type GameRouteId = 'crocodile' | 'mine' | 'wheel' | 'slot' | 'cards'

export const GAME_ROUTE_IDS = [
  'crocodile',
  'mine',
  'wheel',
  'slot',
  'cards',
] as const satisfies readonly GameRouteId[]

export const PRERENDER_PATHS = [
  '/',
  '/games/crocodile',
  '/games/mine',
  '/games/wheel',
  '/games/slot',
  '/games/cards',
] as const

export type PrerenderPath = (typeof PRERENDER_PATHS)[number]

export const GAME_ROUTE_PATHS: Record<GameRouteId, `/games/${GameRouteId}`> = {
  crocodile: '/games/crocodile',
  mine: '/games/mine',
  wheel: '/games/wheel',
  slot: '/games/slot',
  cards: '/games/cards',
}
