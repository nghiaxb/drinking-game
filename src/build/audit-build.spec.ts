import { describe, it, expect } from 'vitest'

import { GAME_ROUTE_IDS } from '@/router/routePaths'
import {
  auditDistBundle,
  collectDistFiles,
  formatAuditReport,
  type DistWalkEntry,
} from './audit-build'

describe('audit-build helpers', () => {
  const mockDist: DistWalkEntry[] = [
    { relativePath: 'assets/app-main.js', rawBytes: 120_000, gzipBytes: 45_000 },
    { relativePath: 'assets/app-main.css', rawBytes: 30_000, gzipBytes: 8_000 },
    { relativePath: 'assets/CrocodileView-abc.js', rawBytes: 25_000, gzipBytes: 9_000 },
    { relativePath: 'assets/MineView-def.js', rawBytes: 22_000, gzipBytes: 8_500 },
    { relativePath: 'assets/WheelView-ghi.js', rawBytes: 28_000, gzipBytes: 10_000 },
    { relativePath: 'assets/CardsView-mno.js', rawBytes: 26_000, gzipBytes: 9_800 },
    { relativePath: 'index.html', rawBytes: 4_000, gzipBytes: 1_500 },
  ]

  it('collects recursive dist file metadata from walk entries', () => {
    const files = collectDistFiles(mockDist)
    expect(files).toHaveLength(mockDist.length)
    expect(files.find((file) => file.relativePath.endsWith('.js'))).toBeDefined()
  })

  it('passes audit when all game routes have lazy chunks and sizes are within limits', () => {
    const result = auditDistBundle(mockDist)
    expect(result.ok).toBe(true)
    expect(result.missingGameChunks).toEqual([])
    expect(result.oversizedJs).toEqual([])

    for (const gameId of GAME_ROUTE_IDS) {
      expect(result.gameChunks[gameId]).toBeDefined()
    }
  })

  it('fails audit when a game lazy chunk is missing', () => {
    const withoutMine = mockDist.filter((entry) => !entry.relativePath.includes('MineView'))
    const result = auditDistBundle(withoutMine)
    expect(result.ok).toBe(false)
    expect(result.missingGameChunks).toContain('mine')
  })

  it('formats a human-readable audit report with byte totals', () => {
    const result = auditDistBundle(mockDist)
    const report = formatAuditReport(result)
    expect(report).toMatch(/Total JS:/)
    expect(report).toMatch(/Total CSS:/)
    expect(report).toMatch(/CrocodileView/)
  })
})
