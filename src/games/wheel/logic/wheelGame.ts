import { DEFAULT_WHEEL_ITEMS, WHEEL_CONFIG } from '../config'
import type {
  EditorDraft,
  EditorValidationResult,
  SpinBlockReason,
  SpinPlan,
  WheelGameState,
  WheelItem,
  WheelPhase,
} from '../types'

export type RandomSource = () => number

export function cloneDefaultItems(): WheelItem[] {
  return DEFAULT_WHEEL_ITEMS.map((item) => ({ ...item }))
}

export function createInitialState(items: WheelItem[] = cloneDefaultItems()): WheelGameState {
  return {
    phase: 'idle',
    items: items.map((item) => ({ ...item })),
    currentRotation: 0,
    winnerId: null,
    winnerLabel: null,
  }
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

export function sanitizeRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) {
    return 0
  }
  return degrees
}

export function getEnabledItems(items: readonly WheelItem[]): WheelItem[] {
  return items.filter((item) => item.enabled)
}

export function countEnabledItems(items: readonly WheelItem[]): number {
  return getEnabledItems(items).length
}

export function resolveWinnerIndex(raw: number, enabledCount: number): number {
  if (enabledCount <= 0) {
    return 0
  }
  if (!Number.isFinite(raw)) {
    return raw === Number.POSITIVE_INFINITY ? enabledCount - 1 : 0
  }
  const normalized = normalizeRngValue(raw)
  return Math.min(enabledCount - 1, Math.floor(normalized * enabledCount))
}

export function selectWinnerId(rng: RandomSource, items: readonly WheelItem[]): string {
  const enabled = getEnabledItems(items)
  if (enabled.length === 0) {
    return ''
  }

  const index = resolveWinnerIndex(rng(), enabled.length)
  return enabled[index]?.id ?? enabled[0]?.id ?? ''
}

export function normalizeAngle(degrees: number): number {
  if (!Number.isFinite(degrees)) {
    return 0
  }
  const wrapped = degrees % 360
  return wrapped < 0 ? wrapped + 360 : wrapped
}

export function computeSegmentCenterAngle(items: readonly WheelItem[], winnerId: string): number {
  const enabled = getEnabledItems(items)
  if (enabled.length === 0) {
    return 0
  }

  const index = enabled.findIndex((item) => item.id === winnerId)
  const resolvedIndex = index >= 0 ? index : 0
  const slice = 360 / enabled.length
  return resolvedIndex * slice + slice / 2
}

/** Clockwise degrees from top; 0 after spin means segment center sits under the fixed pointer. */
export function pointerAlignmentAfterRotation(centerAngle: number, rotation: number): number {
  return normalizeAngle(centerAngle + rotation)
}

export function computeTargetRotation(
  currentRotation: number,
  winnerId: string,
  items: readonly WheelItem[],
  minFullSpins: number = WHEEL_CONFIG.minFullSpins,
): number {
  const safeCurrent = sanitizeRotation(currentRotation)
  const center = computeSegmentCenterAngle(items, winnerId)
  const normalizedCurrent = normalizeAngle(safeCurrent)
  const delta = normalizeAngle(360 - center - normalizedCurrent)
  const safeMinSpins =
    Number.isFinite(minFullSpins) && minFullSpins > 0 ? Math.floor(minFullSpins) : 0
  return safeCurrent + safeMinSpins * 360 + delta
}

/** A forced id only counts while that segment is still enabled; otherwise the rng decides. */
function resolveForcedWinnerId(
  items: readonly WheelItem[],
  forcedWinnerId: string | undefined,
): string | null {
  const wanted = forcedWinnerId?.trim()
  if (!wanted) {
    return null
  }
  return getEnabledItems(items).some((item) => item.id === wanted) ? wanted : null
}

export function computeSpinPlan(
  rng: RandomSource,
  items: readonly WheelItem[],
  currentRotation: number,
  minFullSpins: number = WHEEL_CONFIG.minFullSpins,
  forcedWinnerId?: string,
): SpinPlan {
  const winnerId = resolveForcedWinnerId(items, forcedWinnerId) ?? selectWinnerId(rng, items)
  const winner = getEnabledItems(items).find((item) => item.id === winnerId)
  const targetRotation = computeTargetRotation(currentRotation, winnerId, items, minFullSpins)

  return {
    winnerId,
    winnerLabel: winner?.label ?? '',
    targetRotation,
  }
}

export interface SpinGuardInput {
  phase: WheelPhase
  items: readonly WheelItem[]
  editorOpen: boolean
  editorInvalid: boolean
}

export function getSpinBlockReason(input: SpinGuardInput): SpinBlockReason | null {
  if (input.phase === 'spinning') {
    return 'spinning'
  }
  if (input.editorOpen && input.editorInvalid) {
    return 'editor-invalid'
  }
  if (input.editorOpen) {
    return 'editor-open'
  }
  if (countEnabledItems(input.items) < WHEEL_CONFIG.minEnabledItems) {
    return 'too-few-enabled'
  }
  return null
}

export function slugifyLabel(label: string): string {
  const trimmed = label.trim()
  if (trimmed.length === 0) {
    return 'item'
  }

  const slug = trimmed
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug.length > 0 ? slug : 'item'
}

export function generateUniqueItemId(
  label: string,
  items: readonly WheelItem[],
  excludeId: string | null = null,
): string {
  const base = slugifyLabel(label)
  const used = new Set(items.filter((item) => item.id !== excludeId).map((item) => item.id.trim()))

  if (!used.has(base)) {
    return base
  }

  let suffix = 2
  while (used.has(`${base}-${suffix}`)) {
    suffix += 1
  }
  return `${base}-${suffix}`
}

export function isValidWheelItem(value: unknown): value is WheelItem {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<WheelItem>
  const label = typeof candidate.label === 'string' ? candidate.label.trim() : ''
  return (
    typeof candidate.id === 'string' &&
    candidate.id.trim().length > 0 &&
    label.length > 0 &&
    label.length <= WHEEL_CONFIG.maxLabelLength &&
    typeof candidate.enabled === 'boolean'
  )
}

export function isValidPersistedItems(value: unknown): value is WheelItem[] {
  if (!Array.isArray(value)) {
    return false
  }
  if (value.length === 0) {
    return true
  }
  return value.every(isValidWheelItem)
}

export function validateItemsUniqueIds(items: readonly WheelItem[]): boolean {
  const ids = new Set<string>()
  for (const item of items) {
    const trimmed = item.id.trim()
    if (ids.has(trimmed)) {
      return false
    }
    ids.add(trimmed)
  }
  return true
}

export function sanitizeWheelItem(item: WheelItem): WheelItem | null {
  const label = item.label.trim()
  const id = item.id.trim()
  if (id.length === 0 || label.length === 0 || label.length > WHEEL_CONFIG.maxLabelLength) {
    return null
  }
  return { id, label, enabled: item.enabled }
}

export function sanitizeItems(items: readonly WheelItem[]): WheelItem[] {
  return items
    .map((item) => sanitizeWheelItem(item))
    .filter((item): item is WheelItem => item !== null)
}

export function parsePersistedItems(value: unknown): WheelItem[] {
  if (!isValidPersistedItems(value) || !validateItemsUniqueIds(value)) {
    return cloneDefaultItems()
  }
  return sanitizeItems(value)
}

export function validateEditorDraft(draft: EditorDraft): EditorValidationResult {
  const errors: EditorValidationResult['errors'] = []
  const label = draft.label.trim()

  if (label.length === 0) {
    errors.push({ field: 'label', message: 'Nhãn không được để trống.' })
  }

  if (label.length > WHEEL_CONFIG.maxLabelLength) {
    errors.push({
      field: 'label',
      message: `Nhãn tối đa ${WHEEL_CONFIG.maxLabelLength} ký tự.`,
    })
  }

  return { valid: errors.length === 0, errors }
}

export function buildItemFromDraft(
  draft: EditorDraft,
  existingItems: readonly WheelItem[],
  editingId: string | null,
): WheelItem | null {
  if (!validateEditorDraft(draft).valid) {
    return null
  }

  const label = draft.label.trim()
  if (editingId) {
    const existing = existingItems.find((item) => item.id === editingId)
    if (!existing) {
      return null
    }
    return { id: existing.id, label, enabled: draft.enabled }
  }

  return {
    id: generateUniqueItemId(label, existingItems),
    label,
    enabled: draft.enabled,
  }
}

export interface WheelSegmentLayout {
  id: string
  label: string
  startDeg: number
  endDeg: number
  centerDeg: number
}

export function computeSegmentLayouts(items: readonly WheelItem[]): WheelSegmentLayout[] {
  const enabled = getEnabledItems(items)
  if (enabled.length === 0) {
    return []
  }

  const slice = 360 / enabled.length
  return enabled.map((item, index) => ({
    id: item.id,
    label: item.label,
    startDeg: index * slice,
    endDeg: (index + 1) * slice,
    centerDeg: index * slice + slice / 2,
  }))
}

export function buildConicGradientStops(
  items: readonly WheelItem[],
  colorAtIndex: (index: number) => string,
): string {
  const layouts = computeSegmentLayouts(items)
  if (layouts.length === 0) {
    return '#ccc 0deg 360deg'
  }

  return layouts
    .map((layout, index) => {
      const color = colorAtIndex(index)
      return `${color} ${layout.startDeg}deg ${layout.endDeg}deg`
    })
    .join(', ')
}

export function computeRadialLabelLayout(centerDeg: number): {
  containerTransform: string
  textTransform: string
  topPercent: number
} {
  return {
    containerTransform: `rotate(${centerDeg}deg)`,
    textTransform: `translateX(-50%) rotate(${-centerDeg}deg)`,
    topPercent: 10,
  }
}

export function buildWheelAriaLabel(items: readonly WheelItem[], maxLabels = 8): string {
  const enabledLabels = getEnabledItems(items).map((item) => item.label)
  if (enabledLabels.length === 0) {
    return 'Vòng quay trống'
  }

  const visible = enabledLabels.slice(0, maxLabels)
  const suffix =
    enabledLabels.length > maxLabels ? ` và ${enabledLabels.length - maxLabels} mục khác` : ''
  return `Vòng quay: ${visible.join(', ')}${suffix}`
}

export function tryAddItem(items: readonly WheelItem[], item: WheelItem): WheelItem[] | null {
  const sanitized = sanitizeWheelItem(item)
  if (!sanitized) {
    return null
  }

  const next = [...items.map((entry) => ({ ...entry })), sanitized]
  if (!validateItemsUniqueIds(next)) {
    return null
  }
  return next
}

export function tryUpdateItem(
  items: readonly WheelItem[],
  id: string,
  patch: Partial<Pick<WheelItem, 'label' | 'enabled'>>,
): WheelItem[] | null {
  const next = items.map((item) => {
    if (item.id !== id) {
      return { ...item }
    }
    return sanitizeWheelItem({ ...item, ...patch })
  })

  if (next.some((item) => item === null)) {
    return null
  }

  const resolved = next as WheelItem[]
  if (!validateItemsUniqueIds(resolved)) {
    return null
  }
  return resolved
}

export function tryDeleteItem(items: readonly WheelItem[], id: string): WheelItem[] | null {
  const next = items.filter((item) => item.id !== id).map((item) => ({ ...item }))
  if (next.length === items.length) {
    return null
  }
  return next
}

export function tryToggleItemEnabled(items: readonly WheelItem[], id: string): WheelItem[] | null {
  const target = items.find((item) => item.id === id)
  if (!target) {
    return null
  }
  return tryUpdateItem(items, id, { enabled: !target.enabled })
}

export function tryReplaceItem(
  items: readonly WheelItem[],
  editingId: string,
  nextItem: WheelItem,
): WheelItem[] | null {
  if (!items.some((item) => item.id === editingId)) {
    return null
  }

  const sanitized = sanitizeWheelItem(nextItem)
  if (!sanitized) {
    return null
  }

  const next = items.map((item) => (item.id === editingId ? sanitized : { ...item }))
  if (!validateItemsUniqueIds(next)) {
    return null
  }
  return next
}

export function resetItemsToDefaults(): WheelItem[] {
  return cloneDefaultItems()
}
