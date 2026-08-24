import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

describe('index.html mobile/PWA meta', () => {
  const indexHtml = readFileSync(join(process.cwd(), 'index.html'), 'utf8')

  it('enables standalone-style Apple web app meta without disabling zoom', () => {
    expect(indexHtml).toMatch(/name="apple-mobile-web-app-capable"\s+content="yes"/)
    expect(indexHtml).toMatch(/name="apple-mobile-web-app-status-bar-style"\s+content="default"/)
    expect(indexHtml).toMatch(/name="apple-mobile-web-app-title"\s+content="Drinking Games"/)
    expect(indexHtml).toMatch(/name="format-detection"\s+content="telephone=no"/)
  })

  it('keeps viewport zoom enabled for accessibility', () => {
    expect(indexHtml).toMatch(
      /name="viewport"\s+content="width=device-width,\s*initial-scale=1\.0"/,
    )
    expect(indexHtml).not.toMatch(/user-scalable\s*=\s*no/i)
    expect(indexHtml).not.toMatch(/maximum-scale\s*=\s*1/i)
  })

  it('retains apple touch icon link', () => {
    expect(indexHtml).toMatch(/rel="apple-touch-icon"\s+href="\/icons\/apple-touch-icon\.png"/)
  })
})
