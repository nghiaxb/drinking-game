import { describe, it, expect } from 'vitest'
import { PRERENDER_PATHS } from '@/router/routes'
import { buildSitemapXml } from './sitemap'

const SITE_URL = 'https://drinking-games.app'

describe('sitemap', () => {
  it('includes all six canonical routes', () => {
    const xml = buildSitemapXml(SITE_URL)
    for (const path of PRERENDER_PATHS) {
      const loc = path === '/' ? SITE_URL : `${SITE_URL}${path}`
      expect(xml).toContain(`<loc>${loc}</loc>`)
    }
  })

  it('is valid urlset XML', () => {
    const xml = buildSitemapXml(SITE_URL)
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/)
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain('</urlset>')
  })
})
