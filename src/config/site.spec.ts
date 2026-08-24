import { describe, it, expect } from 'vitest'
import { DEFAULT_SITE_URL, buildCanonicalUrl, getSiteUrl } from './site'

describe('site config', () => {
  it('uses a clear default production URL when env is missing', () => {
    expect(getSiteUrl(undefined)).toBe(DEFAULT_SITE_URL)
    expect(getSiteUrl('')).toBe(DEFAULT_SITE_URL)
    expect(DEFAULT_SITE_URL).toBe('https://drinking-games.app')
  })

  it('strips trailing slashes from configured site URL', () => {
    expect(getSiteUrl('https://example.com/')).toBe('https://example.com')
    expect(getSiteUrl('  https://example.com/  ')).toBe('https://example.com')
  })

  it('builds canonical URLs from path and site base', () => {
    expect(buildCanonicalUrl('/', 'https://drinking-games.app')).toBe('https://drinking-games.app')
    expect(buildCanonicalUrl('/games/crocodile', 'https://drinking-games.app')).toBe(
      'https://drinking-games.app/games/crocodile',
    )
  })
})
