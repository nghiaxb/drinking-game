import { describe, it, expect } from 'vitest'

import { GAME_ROUTE_PATHS, GAME_ROUTE_IDS, PRERENDER_PATHS, type GameRouteId } from './routePaths'

describe('routePaths', () => {
  it('declares exactly five prerender paths', () => {
    expect(PRERENDER_PATHS).toEqual([
      '/',
      '/games/crocodile',
      '/games/mine',
      '/games/wheel',
      '/games/cards',
    ])
  })

  it('maps each game id to a stable path', () => {
    expect(GAME_ROUTE_IDS).toEqual([
      'crocodile',
      'mine',
      'wheel',
      'cards',
    ] satisfies GameRouteId[])

    expect(GAME_ROUTE_PATHS).toEqual({
      crocodile: '/games/crocodile',
      mine: '/games/mine',
      wheel: '/games/wheel',
      cards: '/games/cards',
    })
  })

  it('exports only pure path constants without Vue component references', () => {
    const moduleSource = JSON.stringify({ PRERENDER_PATHS, GAME_ROUTE_PATHS, GAME_ROUTE_IDS })
    expect(moduleSource).not.toMatch(/\.vue|import\s*\(/)
  })
})
