import { test, expect } from '@playwright/test'
import { APP_ROUTES } from '../src/router/routes'
import { PRERENDER_PATHS } from '../src/router/routePaths'
import { DEFAULT_SITE_URL } from '../src/config/site'
import {
  buildPrerenderExpectations,
  parseJsonLdScript,
  parseMetaContent,
  parseTitle,
  verifyPrerenderHtml,
} from '../src/build/dist-verification'
import { seoRequestPath } from './helpers'

const SEO_ROUTES = APP_ROUTES.filter(
  (route) => route.seo && (PRERENDER_PATHS as readonly string[]).includes(route.path),
)

test.describe('SEO static responses', () => {
  for (const route of SEO_ROUTES) {
    test(`${route.path} returns title, description, canonical, OG, Twitter, and JSON-LD`, async ({
      request,
      baseURL,
    }) => {
      const path = seoRequestPath(route.path)
      const response = await request.get(`${baseURL}${path === '/' ? '/' : path}`)
      expect(response.status()).toBe(200)

      const html = await response.text()
      const expected = buildPrerenderExpectations(route, DEFAULT_SITE_URL)

      expect(parseTitle(html)).toBe(expected.title)
      expect(parseMetaContent(html, { name: 'description' })).toBe(expected.description)
      expect(parseMetaContent(html, { property: 'og:title' })).toBe(expected.ogTitle)
      expect(parseMetaContent(html, { property: 'og:description' })).toBe(expected.ogDescription)
      expect(parseMetaContent(html, { property: 'og:image' })).toBe(expected.ogImage)
      expect(parseMetaContent(html, { name: 'twitter:card' })).toBe(expected.twitterCard)
      expect(parseMetaContent(html, { name: 'twitter:title' })).toBe(expected.twitterTitle)
      expect(parseMetaContent(html, { name: 'twitter:description' })).toBe(expected.twitterDescription)
      expect(parseMetaContent(html, { name: 'twitter:image' })).toBe(expected.twitterImage)

      const canonicalMatch = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)
      expect(canonicalMatch?.[1]).toBe(expected.canonical)

      expect(verifyPrerenderHtml(html, expected)).toEqual([])
      expect(parseJsonLdScript(html)).toEqual(expected.jsonLd)
    })
  }
})
