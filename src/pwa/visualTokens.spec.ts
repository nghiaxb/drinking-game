import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

import { PWA_BACKGROUND_COLOR, PWA_THEME_COLOR } from './visualTokens'
import { PWA_MANIFEST } from './manifest'

describe('PWA visual tokens', () => {
  it('matches accent and surface colors from CSS design tokens', () => {
    expect(PWA_THEME_COLOR).toBe('#e85d4c')
    expect(PWA_BACKGROUND_COLOR).toBe('#fef6e8')
  })

  it('aligns manifest theme and background with visual tokens', () => {
    expect(PWA_MANIFEST.theme_color).toBe(PWA_THEME_COLOR)
    expect(PWA_MANIFEST.background_color).toBe(PWA_BACKGROUND_COLOR)
  })

  it('aligns index.html theme-color meta with visual tokens', () => {
    const indexHtml = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
    expect(indexHtml).toContain(`content="${PWA_THEME_COLOR}"`)
    expect(indexHtml).toMatch(/name="theme-color"/)
  })
})
