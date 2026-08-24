import { PRERENDER_PATHS } from '@/router/routePaths'
import { buildCanonicalUrl } from '@/config/site'

export function buildSitemapXml(siteUrl: string): string {
  const normalizedSiteUrl = siteUrl.replace(/\/+$/, '')
  const urls = PRERENDER_PATHS.map((path) => {
    const loc = buildCanonicalUrl(path, normalizedSiteUrl)
    return `  <url>\n    <loc>${loc}</loc>\n  </url>`
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
  ].join('\n')
}
