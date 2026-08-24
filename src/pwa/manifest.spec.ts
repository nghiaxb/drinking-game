import { describe, it, expect } from 'vitest'
import { PWA_MANIFEST } from './manifest'
import { PWA_BACKGROUND_COLOR, PWA_THEME_COLOR } from './visualTokens'

describe('PWA manifest', () => {
  it('uses Vietnamese labels and standalone display', () => {
    expect(PWA_MANIFEST.lang).toBe('vi')
    expect(PWA_MANIFEST.display).toBe('standalone')
    expect(PWA_MANIFEST.orientation).toBe('portrait')
    expect(PWA_MANIFEST.name).toMatch(/Drinking Games/i)
    expect(PWA_MANIFEST.short_name).toBeTruthy()
  })

  it('uses design-token theme and background colors', () => {
    expect(PWA_MANIFEST.theme_color).toBe(PWA_THEME_COLOR)
    expect(PWA_MANIFEST.background_color).toBe(PWA_BACKGROUND_COLOR)
  })

  it('references generated icon assets', () => {
    const sizes = PWA_MANIFEST.icons.map((icon) => icon.sizes)
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
    expect(PWA_MANIFEST.icons.some((icon) => icon.purpose === 'maskable')).toBe(true)
    expect(PWA_MANIFEST.icons.some((icon) => icon.src?.includes('apple-touch-icon'))).toBe(true)
  })

  it('starts at root scope for offline shell navigation', () => {
    expect(PWA_MANIFEST.start_url).toBe('/')
    expect(PWA_MANIFEST.scope).toBe('/')
  })
})
