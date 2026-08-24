import { describe, it, expect } from 'vitest'
import { APP_ROUTES } from '@/router/routes'
import { buildJsonLd, buildRouteHead } from './meta'

const SITE_URL = 'https://drinking-games.app'

describe('SEO meta', () => {
  it('builds canonical, OG, and Twitter tags for every SEO route', () => {
    const seoRoutes = APP_ROUTES.filter((route) => route.seo)
    for (const route of seoRoutes) {
      const seo = route.seo!
      const head = buildRouteHead(route, SITE_URL)

      expect(head.title).toBe(seo.title)
      expect(head.meta).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'description', content: seo.description }),
          expect.objectContaining({ property: 'og:title', content: seo.ogTitle }),
          expect.objectContaining({ property: 'og:description', content: seo.ogDescription }),
          expect.objectContaining({ property: 'og:image', content: expect.stringContaining(seo.ogImage) }),
          expect.objectContaining({ property: 'og:url', content: `${SITE_URL}${route.path === '/' ? '' : route.path}` }),
          expect.objectContaining({ name: 'twitter:card', content: 'summary_large_image' }),
          expect.objectContaining({ name: 'twitter:title', content: seo.ogTitle }),
        ]),
      )
      expect(head.link).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rel: 'canonical',
            href: `${SITE_URL}${route.path === '/' ? '' : route.path}`,
          }),
        ]),
      )
    }
  })

  it('uses WebApplication JSON-LD for home and VideoGame for games', () => {
    const home = APP_ROUTES.find((route) => route.path === '/')!
    const crocodile = APP_ROUTES.find((route) => route.gameId === 'crocodile')!

    expect(buildJsonLd(home, SITE_URL)).toMatchObject({
      '@type': 'WebApplication',
      name: home.seo!.title,
      url: SITE_URL,
    })

    expect(buildJsonLd(crocodile, SITE_URL)).toMatchObject({
      '@type': 'VideoGame',
      name: crocodile.seo!.title,
      url: `${SITE_URL}/games/crocodile`,
    })
  })

  it('does not reference window when building head metadata', () => {
    const route = APP_ROUTES[0]
    const serialized = JSON.stringify(buildRouteHead(route, SITE_URL))
    expect(serialized).not.toMatch(/window/)
  })
})
