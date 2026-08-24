import { describe, expect, it } from 'vitest'
import { DEFAULT_SYMBOL_WEIGHTS, getTotalWeight, normalizeRngValue, pickWeightedSymbol, resolvePickRaw, validateSymbolWeights } from './probabilities'
import { SLOT_SYMBOL_ORDER } from './symbols'

describe('probabilities', () => {
  it('validates weights and clamps invalid entries to zero', () => {
    const validated = validateSymbolWeights({
      beer: 10,
      skull: -1,
      clover: Number.NaN,
      crown: Number.POSITIVE_INFINITY,
      fire: 0,
      dice: 5,
    })

    expect(validated).toEqual({
      beer: 10,
      skull: 0,
      clover: 0,
      crown: 0,
      fire: 0,
      dice: 5,
    })
    expect(getTotalWeight(validated)).toBe(15)
  })

  it('normalizes RNG boundaries including NaN, Infinity, 0 and 1', () => {
    expect(normalizeRngValue(Number.NaN)).toBe(0)
    expect(normalizeRngValue(Number.NEGATIVE_INFINITY)).toBe(0)
    expect(normalizeRngValue(0)).toBe(0)
    expect(normalizeRngValue(-0.5)).toBe(0)
    expect(normalizeRngValue(1)).toBe(0.9999999999999999)
    expect(normalizeRngValue(2)).toBe(0.9999999999999999)
    expect(normalizeRngValue(0.5)).toBe(0.5)
    expect(resolvePickRaw(Number.POSITIVE_INFINITY)).toBe(0.9999999999999999)
  })

  it('maps fixed RNG boundaries to expected symbols with default weights', () => {
    expect(pickWeightedSymbol(DEFAULT_SYMBOL_WEIGHTS, 0)).toBe('beer')
    expect(pickWeightedSymbol(DEFAULT_SYMBOL_WEIGHTS, 0.219999)).toBe('beer')
    expect(pickWeightedSymbol(DEFAULT_SYMBOL_WEIGHTS, 0.22)).toBe('skull')
    expect(pickWeightedSymbol(DEFAULT_SYMBOL_WEIGHTS, 0.419999)).toBe('skull')
    expect(pickWeightedSymbol(DEFAULT_SYMBOL_WEIGHTS, 0.42)).toBe('clover')
    expect(pickWeightedSymbol(DEFAULT_SYMBOL_WEIGHTS, 0.599999)).toBe('clover')
    expect(pickWeightedSymbol(DEFAULT_SYMBOL_WEIGHTS, 0.6)).toBe('crown')
    expect(pickWeightedSymbol(DEFAULT_SYMBOL_WEIGHTS, 0.759999)).toBe('crown')
    expect(pickWeightedSymbol(DEFAULT_SYMBOL_WEIGHTS, 0.76)).toBe('fire')
    expect(pickWeightedSymbol(DEFAULT_SYMBOL_WEIGHTS, 0.899999)).toBe('fire')
    expect(pickWeightedSymbol(DEFAULT_SYMBOL_WEIGHTS, 0.9)).toBe('dice')
    expect(pickWeightedSymbol(DEFAULT_SYMBOL_WEIGHTS, 1)).toBe('dice')
  })

  it('handles non-finite RNG values safely without selecting zero-weight symbols', () => {
    const weights = {
      beer: 50,
      skull: 50,
      clover: 0,
      crown: 0,
      fire: 0,
      dice: 0,
    }

    expect(pickWeightedSymbol(DEFAULT_SYMBOL_WEIGHTS, Number.NaN)).toBe('beer')
    expect(pickWeightedSymbol(DEFAULT_SYMBOL_WEIGHTS, Number.NEGATIVE_INFINITY)).toBe('beer')
    expect(pickWeightedSymbol(weights, Number.POSITIVE_INFINITY)).toBe('skull')
    expect(pickWeightedSymbol(weights, 1)).toBe('skull')
  })

  it('falls back to first symbol when all weights are zero', () => {
    const zeroWeights = SLOT_SYMBOL_ORDER.reduce(
      (acc, id) => ({ ...acc, [id]: 0 }),
      {} as typeof DEFAULT_SYMBOL_WEIGHTS,
    )
    expect(pickWeightedSymbol(zeroWeights, 0.5)).toBe('beer')
  })
})
