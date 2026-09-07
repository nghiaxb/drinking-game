import { describe, it, expect } from 'vitest'

import { APP_ROUTES } from '@/router/routes'
import { buildCanonicalUrl, DEFAULT_SITE_URL } from '@/config/site'
import { buildJsonLd, buildRouteHead } from '@/seo/meta'
import { GAME_ROUTE_IDS } from '@/router/routePaths'
import {
  EXPECTED_OG_IMAGES,
  EXPECTED_SOUND_FILES,
  buildPrerenderExpectations,
  detectGameLazyChunk,
  findOversizedJsFiles,
  listAssetFiles,
  parseJsonLdScript,
  parseMetaContent,
  parseTitle,
  verifyManifestContent,
  verifyPrerenderHtml,
  verifySwPrecacheReferences,
  type DistFileEntry,
  MAX_SINGLE_JS_GZIP_BYTES,
  MAX_SINGLE_JS_RAW_BYTES,
} from './dist-verification'

const SITE_URL = DEFAULT_SITE_URL

describe('dist-verification helpers', () => {
  const homeRoute = APP_ROUTES.find((route) => route.path === '/')!
  const homeExpected = buildPrerenderExpectations(homeRoute, SITE_URL)

  const sampleHomeHtml = `<!DOCTYPE html><html><head>
    <title>${homeExpected.title}</title>
    <meta name="description" content="${homeExpected.description}">
    <meta property="og:title" content="${homeExpected.ogTitle}">
    <meta property="og:description" content="${homeExpected.ogDescription}">
    <meta property="og:image" content="${homeExpected.ogImage}">
    <meta name="twitter:card" content="${homeExpected.twitterCard}">
    <meta name="twitter:title" content="${homeExpected.twitterTitle}">
    <meta name="twitter:description" content="${homeExpected.twitterDescription}">
    <meta name="twitter:image" content="${homeExpected.twitterImage}">
    <link rel="canonical" href="${homeExpected.canonical}">
    <script type="application/ld+json">${JSON.stringify(homeExpected.jsonLd)}</script>
  </head><body></body></html>`

  it('builds expectations from route SEO metadata', () => {
    const wheelRoute = APP_ROUTES.find((route) => route.path === '/games/wheel')!
    const expected = buildPrerenderExpectations(wheelRoute, SITE_URL)
    const head = buildRouteHead(wheelRoute, SITE_URL)

    expect(expected.title).toBe(head.title)
    expect(expected.canonical).toBe(buildCanonicalUrl('/games/wheel', SITE_URL))
    expect(expected.jsonLd).toEqual(buildJsonLd(wheelRoute, SITE_URL))
  })

  it('uses bare site URL for home canonical', () => {
    expect(homeExpected.canonical).toBe(SITE_URL)
    expect(homeExpected.canonical).not.toMatch(/\/$/)
  })

  it('parses prerender HTML meta tags', () => {
    expect(parseTitle(sampleHomeHtml)).toBe(homeExpected.title)
    expect(parseMetaContent(sampleHomeHtml, { name: 'description' })).toBe(
      homeExpected.description,
    )
    expect(parseMetaContent(sampleHomeHtml, { property: 'og:title' })).toBe(homeExpected.ogTitle)
  })

  it('verifies complete prerender HTML without hashed asset names', () => {
    const issues = verifyPrerenderHtml(sampleHomeHtml, homeExpected)
    expect(issues).toEqual([])
  })

  it('reports missing SEO fields in prerender HTML', () => {
    const issues = verifyPrerenderHtml('<html><head><title>Wrong</title></head></html>', homeExpected)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues.some((issue) => issue.includes('title'))).toBe(true)
  })

  it('parses JSON-LD script payload', () => {
    const jsonLd = parseJsonLdScript(sampleHomeHtml)
    expect(jsonLd).toEqual(homeExpected.jsonLd)
  })

  it('validates manifest standalone portrait settings and icon purposes', () => {
    const manifest = {
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        { src: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    }

    expect(verifyManifestContent(manifest)).toEqual([])
  })

  it('lists asset files by extension from dist entries', () => {
    const entries: DistFileEntry[] = [
      { relativePath: 'assets/app-abc.js', rawBytes: 100 },
      { relativePath: 'assets/app-abc.css', rawBytes: 50 },
      { relativePath: 'index.html', rawBytes: 10 },
    ]

    const assets = listAssetFiles(entries)
    expect(assets.js.map((file) => file.relativePath)).toEqual(['assets/app-abc.js'])
    expect(assets.css.map((file) => file.relativePath)).toEqual(['assets/app-abc.css'])
    expect(assets.totalJsBytes).toBe(100)
    expect(assets.totalCssBytes).toBe(50)
  })

  it('detects lazy game chunks by stable view name prefix', () => {
    const entries: DistFileEntry[] = [
      { relativePath: 'assets/CrocodileView-abc123.js', rawBytes: 1000, gzipBytes: 400 },
      { relativePath: 'assets/MineView-def456.js', rawBytes: 1000, gzipBytes: 400 },
      { relativePath: 'assets/WheelView-ghi789.js', rawBytes: 1000, gzipBytes: 400 },
      { relativePath: 'assets/CardsView-mno345.js', rawBytes: 1000, gzipBytes: 400 },
    ]

    for (const gameId of GAME_ROUTE_IDS) {
      expect(detectGameLazyChunk(entries, gameId)).toBeDefined()
    }
  })

  it('flags oversized single JS bundles using documented thresholds', () => {
    const entries: DistFileEntry[] = [
      {
        relativePath: 'assets/app-huge.js',
        rawBytes: MAX_SINGLE_JS_RAW_BYTES + 1,
        gzipBytes: 100,
      },
      {
        relativePath: 'assets/app-gzip-huge.js',
        rawBytes: 1000,
        gzipBytes: MAX_SINGLE_JS_GZIP_BYTES + 1,
      },
    ]

    const violations = findOversizedJsFiles(entries)
    expect(violations).toHaveLength(2)
    expect(violations[0]).toMatch(/raw/)
    expect(violations[1]).toMatch(/gzip/)
  })

  it('checks service worker precache references for sounds and static paths', () => {
    const precacheUrls = [
      ...EXPECTED_SOUND_FILES,
      ...EXPECTED_OG_IMAGES,
      'icons/icon-192.png',
    ]
    const swContent = `precacheAndRoute([${precacheUrls.map((url) => `{url:"${url}"}`).join(',')}])`
    const issues = verifySwPrecacheReferences(swContent, precacheUrls)
    expect(issues).toEqual([])
  })

  it('documents required sound and OG image asset paths', () => {
    expect(EXPECTED_SOUND_FILES).toHaveLength(7)
    expect(EXPECTED_OG_IMAGES).toHaveLength(5)
  })
})
