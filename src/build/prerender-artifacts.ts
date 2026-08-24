import { PRERENDER_PATHS } from '@/router/routePaths'

/**
 * Maps a public route path to nested SSG output (extensionless URL on static hosts).
 * `/` → `index.html`, `/games/crocodile` → `games/crocodile/index.html`
 */
export function toNestedPrerenderFile(routePath: string): string {
  if (routePath === '/') {
    return 'index.html'
  }

  const trimmed = routePath.replace(/^\/+/, '').replace(/\/+$/, '')
  return `${trimmed}/index.html`
}

export const EXPECTED_NESTED_PRERENDER_FILES = PRERENDER_PATHS.map(toNestedPrerenderFile)

/** Flat `.html` siblings (legacy) that must not exist when using nested dirStyle. */
export function toFlatPrerenderFile(routePath: string): string | null {
  if (routePath === '/') {
    return null
  }

  const trimmed = routePath.replace(/^\/+/, '')
  return `${trimmed}.html`
}

export const LEGACY_FLAT_PRERENDER_FILES = PRERENDER_PATHS.map(toFlatPrerenderFile).filter(
  (file): file is string => file !== null,
)
