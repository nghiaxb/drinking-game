import { describe, it, expect } from 'vitest'
import router from './index'
import { APP_ROUTES, PRERENDER_PATHS } from './routes'

type LazyRouteComponent = () => Promise<{ default: unknown }>

describe('router', () => {
  it('registers all prerender routes with lazy components', async () => {
    expect(router.getRoutes().map((route) => route.path)).toEqual(
      expect.arrayContaining([...PRERENDER_PATHS, '/settings']),
    )

    for (const routeDef of APP_ROUTES) {
      const matched =
        routeDef.name === 'not-found'
          ? router.getRoutes().find((entry) => entry.path.includes('pathMatch'))
          : router.getRoutes().find((entry) => entry.path === routeDef.path)
      expect(matched).toBeDefined()
      expect(matched?.name).toBe(routeDef.name)

      const lazyComponent = matched?.components?.default
      expect(typeof lazyComponent).toBe('function')

      const resolved = await (lazyComponent as LazyRouteComponent)()
      expect(resolved.default).toBeDefined()
    }
  })
})
