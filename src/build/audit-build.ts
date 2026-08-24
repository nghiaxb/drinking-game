import type { GameRouteId } from '@/router/routePaths'
import { GAME_ROUTE_IDS } from '@/router/routePaths'
import {
  detectGameLazyChunk,
  findMissingGameChunks,
  findOversizedJsFiles,
  listAssetFiles,
  type DistFileEntry,
} from './dist-verification'

export interface DistWalkEntry {
  relativePath: string
  rawBytes: number
  gzipBytes: number
}

export interface BundleAuditResult {
  ok: boolean
  totalJsBytes: number
  totalCssBytes: number
  totalJsGzipBytes: number
  totalCssGzipBytes: number
  gameChunks: Partial<Record<GameRouteId, string>>
  missingGameChunks: GameRouteId[]
  oversizedJs: string[]
}

export function collectDistFiles(entries: DistWalkEntry[]): DistFileEntry[] {
  return entries.map((entry) => ({
    relativePath: entry.relativePath.replace(/\\/g, '/'),
    rawBytes: entry.rawBytes,
    gzipBytes: entry.gzipBytes,
  }))
}

export function auditDistBundle(entries: DistWalkEntry[]): BundleAuditResult {
  const files = collectDistFiles(entries)
  const assets = listAssetFiles(files)
  const missingGameChunks = findMissingGameChunks(files)
  const oversizedJs = findOversizedJsFiles(files)

  const gameChunks: Partial<Record<GameRouteId, string>> = {}
  for (const gameId of GAME_ROUTE_IDS) {
    const chunk = detectGameLazyChunk(files, gameId)
    if (chunk) {
      gameChunks[gameId] = chunk
    }
  }

  const totalJsGzipBytes = assets.js.reduce((sum, entry) => sum + (entry.gzipBytes ?? 0), 0)
  const totalCssGzipBytes = assets.css.reduce((sum, entry) => sum + (entry.gzipBytes ?? 0), 0)

  return {
    ok: missingGameChunks.length === 0 && oversizedJs.length === 0,
    totalJsBytes: assets.totalJsBytes,
    totalCssBytes: assets.totalCssBytes,
    totalJsGzipBytes,
    totalCssGzipBytes,
    gameChunks,
    missingGameChunks,
    oversizedJs,
  }
}

function formatKiB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KiB`
}

export function formatAuditReport(result: BundleAuditResult): string {
  const lines = [
    `[audit-build] Total JS: ${formatKiB(result.totalJsBytes)} raw / ${formatKiB(result.totalJsGzipBytes)} gzip`,
    `[audit-build] Total CSS: ${formatKiB(result.totalCssBytes)} raw / ${formatKiB(result.totalCssGzipBytes)} gzip`,
  ]

  for (const gameId of GAME_ROUTE_IDS) {
    lines.push(`[audit-build] ${gameId} chunk: ${result.gameChunks[gameId] ?? 'MISSING'}`)
  }

  if (result.missingGameChunks.length > 0) {
    lines.push(`[audit-build] Missing game chunks: ${result.missingGameChunks.join(', ')}`)
  }

  if (result.oversizedJs.length > 0) {
    lines.push('[audit-build] Oversized JS files:')
    for (const violation of result.oversizedJs) {
      lines.push(`  - ${violation}`)
    }
  }

  return lines.join('\n')
}
