import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

import {
  EXPECTED_NESTED_PRERENDER_FILES,
  LEGACY_FLAT_PRERENDER_FILES,
  toNestedPrerenderFile,
} from '../src/build/prerender-artifacts.ts'
import { auditDistBundle, formatAuditReport, type DistWalkEntry } from '../src/build/audit-build.ts'
import {
  buildPrerenderExpectations,
  EXPECTED_OG_IMAGES,
  EXPECTED_SOUND_FILES,
  verifyManifestContent,
  verifyPrerenderHtml,
  verifySwPrecacheReferences,
} from '../src/build/dist-verification.ts'
import { DEFAULT_SITE_URL } from '../src/config/site.ts'
import { APP_ROUTES } from '../src/router/routes.ts'
import { PRERENDER_PATHS } from '../src/router/routePaths.ts'
import { buildRobotsTxt } from '../src/seo/robots.ts'
import { buildSitemapXml } from '../src/seo/sitemap.ts'

const distDir = join(process.cwd(), 'dist')
const siteUrl = (process.env.VITE_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, '')

function walkDist(relativeDir = ''): DistWalkEntry[] {
  const currentDir = join(distDir, relativeDir)
  const entries = readdirSync(currentDir, { withFileTypes: true })
  const files: DistWalkEntry[] = []

  for (const entry of entries) {
    const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name
    const absolutePath = join(distDir, relativePath)

    if (entry.isDirectory()) {
      files.push(...walkDist(relativePath))
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    const rawBuffer = readFileSync(absolutePath)
    files.push({
      relativePath,
      rawBytes: rawBuffer.byteLength,
      gzipBytes: gzipSync(rawBuffer).byteLength,
    })
  }

  return files
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

const missingNested = EXPECTED_NESTED_PRERENDER_FILES.filter(
  (file) => !existsSync(join(distDir, file)),
)

if (missingNested.length > 0) {
  console.error('[verify-dist] Missing nested prerender artifacts:')
  for (const file of missingNested) {
    console.error(`  - dist/${file}`)
  }
  process.exit(1)
}

const legacyPresent = LEGACY_FLAT_PRERENDER_FILES.filter((file) =>
  existsSync(join(distDir, file)),
)

if (legacyPresent.length > 0) {
  console.error('[verify-dist] Legacy flat prerender files must not exist:')
  for (const file of legacyPresent) {
    console.error(`  - dist/${file}`)
  }
  process.exit(1)
}

const requiredRootFiles = [
  'manifest.webmanifest',
  'sw.js',
  'robots.txt',
  'sitemap.xml',
  'icons/icon-192.png',
  'icons/icon-512.png',
]

const missingRoot = requiredRootFiles.filter((file) => !existsSync(join(distDir, file)))

if (missingRoot.length > 0) {
  console.error('[verify-dist] Missing PWA/static root artifacts:')
  for (const file of missingRoot) {
    console.error(`  - dist/${file}`)
  }
  process.exit(1)
}

for (const soundPath of EXPECTED_SOUND_FILES) {
  if (!existsSync(join(distDir, soundPath))) {
    fail(`[verify-dist] Missing sound asset: dist/${soundPath}`)
  }
}

for (const ogPath of EXPECTED_OG_IMAGES) {
  if (!existsSync(join(distDir, ogPath))) {
    fail(`[verify-dist] Missing OG image: dist/${ogPath}`)
  }
}

const robots = buildRobotsTxt(siteUrl)
const sitemap = `${buildSitemapXml(siteUrl)}\n`
const distRobots = readFileSync(join(distDir, 'robots.txt'), 'utf8')
const distSitemap = readFileSync(join(distDir, 'sitemap.xml'), 'utf8')

if (distRobots !== robots) {
  fail('[verify-dist] dist/robots.txt does not match generated content for VITE_SITE_URL')
}

if (distSitemap !== sitemap) {
  fail('[verify-dist] dist/sitemap.xml does not match generated content for VITE_SITE_URL')
}

for (const routePath of PRERENDER_PATHS) {
  const route = APP_ROUTES.find((entry) => entry.path === routePath)
  if (!route) {
    fail(`[verify-dist] Missing APP_ROUTES entry for prerender path ${routePath}`)
  }

  const htmlPath = join(distDir, toNestedPrerenderFile(routePath))
  const html = readFileSync(htmlPath, 'utf8')
  const expected = buildPrerenderExpectations(route, siteUrl)
  const htmlIssues = verifyPrerenderHtml(html, expected)

  if (htmlIssues.length > 0) {
    console.error(`[verify-dist] SEO issues in dist/${toNestedPrerenderFile(routePath)}:`)
    for (const issue of htmlIssues) {
      console.error(`  - ${issue}`)
    }
    process.exit(1)
  }
}

const manifestRaw = readFileSync(join(distDir, 'manifest.webmanifest'), 'utf8')
let manifestJson: unknown
try {
  manifestJson = JSON.parse(manifestRaw)
} catch {
  fail('[verify-dist] manifest.webmanifest is not valid JSON')
}

const manifestIssues = verifyManifestContent(manifestJson)
if (manifestIssues.length > 0) {
  console.error('[verify-dist] Manifest validation issues:')
  for (const issue of manifestIssues) {
    console.error(`  - ${issue}`)
  }
  process.exit(1)
}

const swContent = readFileSync(join(distDir, 'sw.js'), 'utf8')
const swIssues = verifySwPrecacheReferences(swContent, [
  ...EXPECTED_SOUND_FILES,
  ...EXPECTED_OG_IMAGES,
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'index.html',
])

if (swIssues.length > 0) {
  console.error('[verify-dist] Service worker precache issues:')
  for (const issue of swIssues) {
    console.error(`  - ${issue}`)
  }
  process.exit(1)
}

const auditResult = auditDistBundle(walkDist())
console.log(formatAuditReport(auditResult))

if (!auditResult.ok) {
  process.exit(1)
}

console.log(
  `[verify-dist] OK — ${EXPECTED_NESTED_PRERENDER_FILES.length} nested HTML files, PWA + SEO artifacts, bundle audit`,
)
