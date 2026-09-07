import type { AppRouteDefinition } from '@/router/routes'
import { buildCanonicalUrl } from '@/config/site'
import { buildJsonLd, type JsonLdBase } from '@/seo/meta'
import type { GameRouteId } from '@/router/routePaths'
import { GAME_ROUTE_IDS } from '@/router/routePaths'

/** Documented raw-byte ceiling for any single JS bundle file. */
export const MAX_SINGLE_JS_RAW_BYTES = 700 * 1024

/** Documented gzip-byte ceiling for any single JS bundle file. */
export const MAX_SINGLE_JS_GZIP_BYTES = 300 * 1024

export const EXPECTED_SOUND_FILES = [
  'sounds/click.wav',
  'sounds/tick.wav',
  'sounds/win.wav',
  'sounds/lose.wav',
  'sounds/chomp.wav',
  'sounds/explosion.wav',
  'sounds/spin.wav',
] as const

export const EXPECTED_OG_IMAGES = [
  'og/og-home.png',
  'og/og-crocodile.png',
  'og/og-mine.png',
  'og/og-wheel.png',
  'og/og-cards.png',
  'og/og-bomb.png',
] as const

export interface DistFileEntry {
  relativePath: string
  rawBytes: number
  gzipBytes?: number
}

export interface PrerenderHtmlExpectations {
  title: string
  description: string
  canonical: string
  ogTitle: string
  ogDescription: string
  ogImage: string
  twitterCard: string
  twitterTitle: string
  twitterDescription: string
  twitterImage: string
  jsonLd: JsonLdBase
}

const GAME_VIEW_CHUNK_PREFIX: Record<GameRouteId, string> = {
  crocodile: 'CrocodileView',
  mine: 'MineView',
  wheel: 'WheelView',
  cards: 'CardsView',
  bomb: 'BombView',
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildPrerenderExpectations(
  route: AppRouteDefinition,
  siteUrl: string,
): PrerenderHtmlExpectations {
  if (!route.seo) {
    throw new Error(`Route ${route.path} has no SEO metadata`)
  }

  const canonical = buildCanonicalUrl(route.path, siteUrl)
  const ogImage = route.seo.ogImage.startsWith('http')
    ? route.seo.ogImage
    : `${siteUrl}${route.seo.ogImage}`

  return {
    title: route.seo.title,
    description: route.seo.description,
    canonical,
    ogTitle: route.seo.ogTitle,
    ogDescription: route.seo.ogDescription,
    ogImage,
    twitterCard: 'summary_large_image',
    twitterTitle: route.seo.ogTitle,
    twitterDescription: route.seo.ogDescription,
    twitterImage: ogImage,
    jsonLd: buildJsonLd(route, siteUrl),
  }
}

export function parseTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return match?.[1]?.trim() ?? null
}

export function parseMetaContent(
  html: string,
  selector: { name?: string; property?: string },
): string | null {
  if (selector.name) {
    const pattern = new RegExp(
      `<meta\\s+[^>]*name="${escapeRegExp(selector.name)}"[^>]*content="([^"]*)"`,
      'i',
    )
    const match = html.match(pattern)
    if (match?.[1]) {
      return match[1]
    }

    const reversed = new RegExp(
      `<meta\\s+[^>]*content="([^"]*)"[^>]*name="${escapeRegExp(selector.name)}"`,
      'i',
    )
    return html.match(reversed)?.[1] ?? null
  }

  if (selector.property) {
    const pattern = new RegExp(
      `<meta\\s+[^>]*property="${escapeRegExp(selector.property)}"[^>]*content="([^"]*)"`,
      'i',
    )
    const match = html.match(pattern)
    if (match?.[1]) {
      return match[1]
    }

    const reversed = new RegExp(
      `<meta\\s+[^>]*content="([^"]*)"[^>]*property="${escapeRegExp(selector.property)}"`,
      'i',
    )
    return html.match(reversed)?.[1] ?? null
  }

  return null
}

export function parseCanonical(html: string): string | null {
  const match = html.match(/<link\s+[^>]*rel="canonical"[^>]*href="([^"]*)"/i)
  if (match?.[1]) {
    return match[1]
  }

  return html.match(/<link\s+[^>]*href="([^"]*)"[^>]*rel="canonical"/i)?.[1] ?? null
}

export function parseJsonLdScript(html: string): JsonLdBase | null {
  const match = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i,
  )
  if (!match?.[1]) {
    return null
  }

  try {
    return JSON.parse(match[1].trim()) as JsonLdBase
  } catch {
    return null
  }
}

export function verifyPrerenderHtml(
  html: string,
  expected: PrerenderHtmlExpectations,
): string[] {
  const issues: string[] = []

  const title = parseTitle(html)
  if (title !== expected.title) {
    issues.push(`title expected "${expected.title}" but got "${title ?? 'missing'}"`)
  }

  const checks: Array<[string, string | null, string]> = [
    ['description', parseMetaContent(html, { name: 'description' }), expected.description],
    ['canonical', parseCanonical(html), expected.canonical],
    ['og:title', parseMetaContent(html, { property: 'og:title' }), expected.ogTitle],
    [
      'og:description',
      parseMetaContent(html, { property: 'og:description' }),
      expected.ogDescription,
    ],
    ['og:image', parseMetaContent(html, { property: 'og:image' }), expected.ogImage],
    ['twitter:card', parseMetaContent(html, { name: 'twitter:card' }), expected.twitterCard],
    ['twitter:title', parseMetaContent(html, { name: 'twitter:title' }), expected.twitterTitle],
    [
      'twitter:description',
      parseMetaContent(html, { name: 'twitter:description' }),
      expected.twitterDescription,
    ],
    ['twitter:image', parseMetaContent(html, { name: 'twitter:image' }), expected.twitterImage],
  ]

  for (const [label, actual, wanted] of checks) {
    if (actual !== wanted) {
      issues.push(`${label} expected "${wanted}" but got "${actual ?? 'missing'}"`)
    }
  }

  const jsonLd = parseJsonLdScript(html)
  if (!jsonLd) {
    issues.push('JSON-LD script missing or invalid')
  } else if (JSON.stringify(jsonLd) !== JSON.stringify(expected.jsonLd)) {
    issues.push('JSON-LD payload does not match expected schema')
  }

  return issues
}

interface ManifestIcon {
  src?: string
  sizes?: string
  type?: string
  purpose?: string
}

interface ParsedManifest {
  display?: string
  orientation?: string
  start_url?: string
  scope?: string
  icons?: ManifestIcon[]
}

export function verifyManifestContent(manifest: unknown): string[] {
  const issues: string[] = []

  if (!manifest || typeof manifest !== 'object') {
    return ['manifest is not a JSON object']
  }

  const parsed = manifest as ParsedManifest

  if (parsed.display !== 'standalone') {
    issues.push(`manifest display expected "standalone" but got "${parsed.display ?? 'missing'}"`)
  }

  if (parsed.orientation !== 'portrait') {
    issues.push(`manifest orientation expected "portrait" but got "${parsed.orientation ?? 'missing'}"`)
  }

  if (parsed.start_url !== '/') {
    issues.push(`manifest start_url expected "/" but got "${parsed.start_url ?? 'missing'}"`)
  }

  if (parsed.scope !== '/') {
    issues.push(`manifest scope expected "/" but got "${parsed.scope ?? 'missing'}"`)
  }

  const icons = parsed.icons ?? []
  if (!icons.some((icon) => icon.purpose === 'maskable')) {
    issues.push('manifest is missing a maskable icon')
  }

  if (!icons.some((icon) => icon.src?.includes('apple-touch-icon'))) {
    issues.push('manifest is missing apple-touch-icon entry')
  }

  return issues
}

export function verifySwPrecacheReferences(swContent: string, requiredPaths: readonly string[]): string[] {
  const issues: string[] = []

  for (const requiredPath of requiredPaths) {
    if (!swContent.includes(requiredPath)) {
      issues.push(`service worker precache missing reference to "${requiredPath}"`)
    }
  }

  return issues
}

export function listAssetFiles(entries: DistFileEntry[]): {
  js: DistFileEntry[]
  css: DistFileEntry[]
  totalJsBytes: number
  totalCssBytes: number
} {
  const js = entries.filter((entry) => entry.relativePath.endsWith('.js'))
  const css = entries.filter((entry) => entry.relativePath.endsWith('.css'))

  return {
    js,
    css,
    totalJsBytes: js.reduce((sum, entry) => sum + entry.rawBytes, 0),
    totalCssBytes: css.reduce((sum, entry) => sum + entry.rawBytes, 0),
  }
}

export function detectGameLazyChunk(
  entries: DistFileEntry[],
  gameId: GameRouteId,
): string | undefined {
  const prefix = GAME_VIEW_CHUNK_PREFIX[gameId]
  const match = entries.find(
    (entry) =>
      entry.relativePath.includes('assets/') &&
      entry.relativePath.endsWith('.js') &&
      entry.relativePath.includes(prefix),
  )
  return match?.relativePath
}

export function findOversizedJsFiles(entries: DistFileEntry[]): string[] {
  const violations: string[] = []
  const jsEntries = entries.filter((entry) => entry.relativePath.endsWith('.js'))

  for (const entry of jsEntries) {
    if (entry.rawBytes > MAX_SINGLE_JS_RAW_BYTES) {
      violations.push(
        `${entry.relativePath} exceeds raw JS limit (${entry.rawBytes} > ${MAX_SINGLE_JS_RAW_BYTES})`,
      )
    }

    if (entry.gzipBytes !== undefined && entry.gzipBytes > MAX_SINGLE_JS_GZIP_BYTES) {
      violations.push(
        `${entry.relativePath} exceeds gzip JS limit (${entry.gzipBytes} > ${MAX_SINGLE_JS_GZIP_BYTES})`,
      )
    }
  }

  return violations
}

export function findMissingGameChunks(entries: DistFileEntry[]): GameRouteId[] {
  return GAME_ROUTE_IDS.filter((gameId) => !detectGameLazyChunk(entries, gameId))
}
