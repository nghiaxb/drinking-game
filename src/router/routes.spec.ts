import { describe, it, expect } from 'vitest'

import { APP_ROUTES, PRERENDER_PATHS, type GameRouteId, getRouteByPath } from './routes'

type LazyRouteComponent = () => Promise<{ default: unknown }>

describe('routes', () => {
  it('declares exactly six prerender paths via routePaths re-export', () => {
    expect(PRERENDER_PATHS).toHaveLength(6)
  })

  it('registers home, five games, and the three noIndex utility routes', () => {
    // Derived, not hardcoded: adding a prerendered route should not need this number edited.
    expect(APP_ROUTES).toHaveLength(PRERENDER_PATHS.length + 3)

    expect(APP_ROUTES.slice(0, PRERENDER_PATHS.length).map((route) => route.path)).toEqual([
      ...PRERENDER_PATHS,
    ])

    expect(APP_ROUTES.find((route) => route.name === 'settings')?.path).toBe('/settings')

    expect(APP_ROUTES.find((route) => route.name === 'cheat')?.path).toBe('/x')

    expect(APP_ROUTES.find((route) => route.name === 'not-found')).toBeDefined()
  })

  it('marks settings, cheat and not-found as noindex utility routes', () => {
    expect(getRouteByPath('/settings')?.noIndex).toBe(true)

    expect(getRouteByPath('/x')?.noIndex).toBe(true)

    expect(getRouteByPath('/does-not-exist')?.noIndex).toBe(true)

    expect(getRouteByPath('/')?.noIndex).toBeUndefined()
  })

  it('maps each game route to a unique game id', () => {
    const gameIds = APP_ROUTES.filter((route) => route.gameId).map((route) => route.gameId)

    expect(gameIds).toEqual(['crocodile', 'mine', 'wheel', 'cards', 'bomb'] satisfies GameRouteId[])
  })

  it('lazy-loads a component for every route', async () => {
    for (const route of APP_ROUTES) {
      const lazyComponent = route.component as LazyRouteComponent

      expect(typeof lazyComponent).toBe('function')

      const resolved = await lazyComponent()

      expect(resolved.default).toBeDefined()
    }
  })

  it('exposes typed route lookup by path', () => {
    expect(getRouteByPath('/')).toMatchObject({ name: 'home' })

    expect(getRouteByPath('/games/wheel')?.gameId).toBe('wheel')

    expect(getRouteByPath('/settings')?.name).toBe('settings')

    expect(getRouteByPath('/missing')?.name).toBe('not-found')
  })
})
