import { SLOT_SYMBOL_ORDER } from './symbols'
import type { SlotSymbolId, SymbolWeights } from './types'

export const DEFAULT_SYMBOL_WEIGHTS: SymbolWeights = {
  beer: 22,
  skull: 20,
  clover: 18,
  crown: 16,
  fire: 14,
  dice: 10,
}

export function normalizeRngValue(raw: number): number {
  if (!Number.isFinite(raw)) {
    return 0
  }
  if (raw <= 0) {
    return 0
  }
  if (raw >= 1) {
    return 0.9999999999999999
  }
  return raw
}

export function resolvePickRaw(raw: number): number {
  if (raw === Number.POSITIVE_INFINITY) {
    return 0.9999999999999999
  }
  return normalizeRngValue(raw)
}

export function validateSymbolWeights(weights: SymbolWeights): SymbolWeights {
  const validated = {} as SymbolWeights
  for (const id of SLOT_SYMBOL_ORDER) {
    const value = weights[id]
    validated[id] = Number.isFinite(value) && value > 0 ? value : 0
  }
  return validated
}

export function getTotalWeight(validated: SymbolWeights): number {
  return SLOT_SYMBOL_ORDER.reduce((sum, id) => sum + validated[id], 0)
}

function pickLastEligible(validated: SymbolWeights): SlotSymbolId {
  for (let index = SLOT_SYMBOL_ORDER.length - 1; index >= 0; index -= 1) {
    const id = SLOT_SYMBOL_ORDER[index]
    if (validated[id] > 0) {
      return id
    }
  }
  return SLOT_SYMBOL_ORDER[0]
}

export function pickWeightedSymbol(weights: SymbolWeights, raw: number): SlotSymbolId {
  const validated = validateSymbolWeights(weights)
  const total = getTotalWeight(validated)
  if (total <= 0) {
    return SLOT_SYMBOL_ORDER[0]
  }

  const pickRaw = resolvePickRaw(raw)
  let threshold = pickRaw * total

  for (const id of SLOT_SYMBOL_ORDER) {
    const weight = validated[id]
    if (weight <= 0) {
      continue
    }
    threshold -= weight
    if (threshold < 0) {
      return id
    }
  }

  return pickLastEligible(validated)
}
