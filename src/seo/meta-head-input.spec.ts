import { describe, it, expect } from 'vitest'
import type { UseHeadInput } from '@unhead/vue'
import { APP_ROUTES } from '@/router/routes'
import { buildRouteHeadInput } from './meta'

const SITE_URL = 'https://drinking-games.app'

describe('buildRouteHeadInput', () => {
  it('returns a UseHeadInput-compatible object without unsafe casts', () => {
    const seoRoutes = APP_ROUTES.filter((route) => route.seo)
    for (const route of seoRoutes) {
      const head: UseHeadInput = buildRouteHeadInput(route, SITE_URL)

      expect(typeof head).toBe('object')
      expect(head).toMatchObject({
        title: route.seo!.title,
      })
    }
  })
})
