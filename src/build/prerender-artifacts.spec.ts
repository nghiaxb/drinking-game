import { describe, it, expect } from 'vitest'
import { PRERENDER_PATHS } from '@/router/routePaths'
import {
  EXPECTED_NESTED_PRERENDER_FILES,
  LEGACY_FLAT_PRERENDER_FILES,
  toNestedPrerenderFile,
} from './prerender-artifacts'

describe('prerender artifacts', () => {
  it('maps six routes to nested index.html paths for extensionless static hosting', () => {
    expect(EXPECTED_NESTED_PRERENDER_FILES).toEqual([
      'index.html',
      'games/crocodile/index.html',
      'games/mine/index.html',
      'games/wheel/index.html',
      'games/slot/index.html',
      'games/cards/index.html',
    ])
  })

  it('derives nested paths from PRERENDER_PATHS', () => {
    expect(PRERENDER_PATHS.map(toNestedPrerenderFile)).toEqual(EXPECTED_NESTED_PRERENDER_FILES)
  })

  it('documents legacy flat filenames to reject in dist verification', () => {
    expect(LEGACY_FLAT_PRERENDER_FILES).toEqual([
      'games/crocodile.html',
      'games/mine.html',
      'games/wheel.html',
      'games/slot.html',
      'games/cards.html',
    ])
  })
})
