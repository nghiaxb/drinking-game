import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_SITE_URL } from '../src/config/site.ts'
import { buildRobotsTxt } from '../src/seo/robots.ts'
import { buildSitemapXml } from '../src/seo/sitemap.ts'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const siteUrl = (process.env.VITE_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, '')
const publicDir = join(rootDir, 'public')

mkdirSync(publicDir, { recursive: true })

writeFileSync(join(publicDir, 'robots.txt'), buildRobotsTxt(siteUrl), 'utf8')
writeFileSync(join(publicDir, 'sitemap.xml'), `${buildSitemapXml(siteUrl)}\n`, 'utf8')

console.log(`Generated public/robots.txt and public/sitemap.xml for ${siteUrl}`)
