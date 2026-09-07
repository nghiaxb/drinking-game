/** Default production URL — replace via VITE_SITE_URL before deploy. */
export const DEFAULT_SITE_URL = 'https://drinking-games.app'

/**
 * Resolve canonical site base URL without relying on `window` (SSG-safe).
 */
export function getSiteUrl(envValue: string | undefined = import.meta.env.VITE_SITE_URL): string {
  const trimmed = envValue?.trim()
  if (trimmed) {
    return trimmed.replace(/\/+$/, '')
  }
  return DEFAULT_SITE_URL
}

/**
 * Build absolute canonical URL for a route path.
 */
export function buildCanonicalUrl(path: string, siteUrl: string = getSiteUrl()): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (normalizedPath === '/') {
    return siteUrl
  }
  return `${siteUrl}${normalizedPath}`
}

/**
 * Cheat control channel base url. Empty means the feature is off: no socket is ever opened.
 */
export function getCheatSocketUrl(
  envValue: string | undefined = import.meta.env.VITE_CHEAT_SOCKET_URL,
): string {
  const trimmed = envValue?.trim()
  if (!trimmed) {
    return ''
  }
  return trimmed.replace(/\/+$/, '')
}
