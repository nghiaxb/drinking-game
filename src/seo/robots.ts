export function buildRobotsTxt(siteUrl: string): string {
  const normalizedSiteUrl = siteUrl.replace(/\/+$/, '')

  return [`User-agent: *`, `Allow: /`, ``, `Sitemap: ${normalizedSiteUrl}/sitemap.xml`, ''].join('\n')
}
