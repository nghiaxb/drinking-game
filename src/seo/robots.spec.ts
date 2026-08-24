import { describe, it, expect } from 'vitest'
import { buildRobotsTxt } from './robots'

describe('robots.txt', () => {
  it('references sitemap from the provided site URL', () => {
    const robots = buildRobotsTxt('https://example.com')
    expect(robots).toContain('Sitemap: https://example.com/sitemap.xml')
    expect(robots).not.toContain('drinking-games.app')
  })

  it('allows all crawlers', () => {
    const robots = buildRobotsTxt('https://drinking-games.app')
    expect(robots).toMatch(/^User-agent: \*\r?\nAllow: \//m)
  })

  it('strips trailing slash from site URL before building sitemap reference', () => {
    const robots = buildRobotsTxt('https://example.com/')
    expect(robots).toContain('Sitemap: https://example.com/sitemap.xml')
  })
})
