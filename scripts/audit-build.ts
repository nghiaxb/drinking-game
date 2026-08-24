import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

import { auditDistBundle, formatAuditReport, type DistWalkEntry } from '../src/build/audit-build.ts'

const distDir = join(process.cwd(), 'dist')

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

if (!existsSync(distDir)) {
  console.error('[audit-build] dist/ directory not found — run npm run build first')
  process.exit(1)
}

const result = auditDistBundle(walkDist())
console.log(formatAuditReport(result))

if (!result.ok) {
  process.exit(1)
}

console.log('[audit-build] OK')
