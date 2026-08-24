import type { SlotSymbol, SlotSymbolId } from './types'

export const SLOT_SYMBOLS: Record<SlotSymbolId, SlotSymbol> = {
  beer: { id: 'beer', emoji: '🍺', label: 'Bia' },
  skull: { id: 'skull', emoji: '💀', label: 'Đầu lâu' },
  clover: { id: 'clover', emoji: '🍀', label: 'Cỏ ba lá' },
  crown: { id: 'crown', emoji: '👑', label: 'Vương miện' },
  fire: { id: 'fire', emoji: '🔥', label: 'Lửa' },
  dice: { id: 'dice', emoji: '🎲', label: 'Xúc xắc' },
}

export const SLOT_SYMBOL_ORDER: readonly SlotSymbolId[] = [
  'beer',
  'skull',
  'clover',
  'crown',
  'fire',
  'dice',
]

export function getSymbolEmoji(id: SlotSymbolId): string {
  return SLOT_SYMBOLS[id]?.emoji ?? '❓'
}

export function getSymbolLabel(id: SlotSymbolId): string {
  return SLOT_SYMBOLS[id]?.label ?? 'Không xác định'
}

export function isSlotSymbolId(value: unknown): value is SlotSymbolId {
  return typeof value === 'string' && value in SLOT_SYMBOLS
}

export function formatSymbolRow(symbols: readonly SlotSymbolId[]): string {
  return symbols.map((id) => getSymbolEmoji(id)).join(' ')
}
