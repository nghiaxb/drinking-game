import { describe, it, expect } from 'vitest'
import { DEFAULT_WHEEL_ITEMS, WHEEL_CONFIG } from '../config'
import type { WheelItem } from '../types'
import {
  buildConicGradientStops,
  buildItemFromDraft,
  buildWheelAriaLabel,
  cloneDefaultItems,
  computeRadialLabelLayout,
  computeSegmentCenterAngle,
  computeSegmentLayouts,
  computeSpinPlan,
  computeTargetRotation,
  countEnabledItems,
  createInitialState,
  generateUniqueItemId,
  getEnabledItems,
  getSpinBlockReason,
  isValidPersistedItems,
  normalizeAngle,
  normalizeRngValue,
  parsePersistedItems,
  pointerAlignmentAfterRotation,
  resetItemsToDefaults,
  selectWinnerId,
  slugifyLabel,
  tryAddItem,
  tryDeleteItem,
  tryReplaceItem,
  tryToggleItemEnabled,
  tryUpdateItem,
  validateEditorDraft,
  validateItemsUniqueIds,
} from './wheelGame'

describe('wheelGame defaults and model', () => {
  it('provides six default items with expected labels', () => {
    expect(DEFAULT_WHEEL_ITEMS).toHaveLength(6)
    expect(DEFAULT_WHEEL_ITEMS.map((item) => item.label)).toEqual([
      'Uống 50%',
      'Uống 100%',
      'Chỉ định người',
      'Đồng khởi',
      'Miễn uống',
      'Double',
    ])
    expect(DEFAULT_WHEEL_ITEMS.every((item) => item.enabled && item.id.length > 0)).toBe(true)
  })

  it('clones defaults for initial state', () => {
    const state = createInitialState()
    expect(state.phase).toBe('idle')
    expect(state.currentRotation).toBe(0)
    expect(state.winnerId).toBeNull()
    expect(state.items).toEqual(DEFAULT_WHEEL_ITEMS)
    expect(state.items).not.toBe(DEFAULT_WHEEL_ITEMS)
  })
})

describe('wheelGame enabled filtering and RNG', () => {
  const items: WheelItem[] = [
    { id: 'a', label: 'A', enabled: true },
    { id: 'b', label: 'B', enabled: false },
    { id: 'c', label: 'C', enabled: true },
  ]

  it('filters enabled items preserving order', () => {
    expect(getEnabledItems(items)).toEqual([
      { id: 'a', label: 'A', enabled: true },
      { id: 'c', label: 'C', enabled: true },
    ])
  })

  it('counts enabled items', () => {
    expect(countEnabledItems(items)).toBe(2)
  })

  it('selects winner from enabled items only', () => {
    expect(selectWinnerId(() => 0, items)).toBe('a')
    expect(selectWinnerId(() => 0.49, items)).toBe('a')
    expect(selectWinnerId(() => 0.51, items)).toBe('c')
    expect(selectWinnerId(() => 0.99, items)).toBe('c')
  })

  it('guards NaN, Infinity, and boundary RNG values', () => {
    expect(selectWinnerId(() => Number.NaN, items)).toBe('a')
    expect(selectWinnerId(() => Number.POSITIVE_INFINITY, items)).toBe('c')
    expect(selectWinnerId(() => Number.NEGATIVE_INFINITY, items)).toBe('a')
    expect(selectWinnerId(() => 0, items)).toBe('a')
    expect(selectWinnerId(() => 1, items)).toBe('c')
  })

  it('returns empty id when no enabled items exist', () => {
    const disabled = items.map((item) => ({ ...item, enabled: false }))
    expect(selectWinnerId(() => 0.5, disabled)).toBe('')
  })

  it('normalizes RNG values safely', () => {
    expect(normalizeRngValue(Number.NaN)).toBe(0)
    expect(normalizeRngValue(-1)).toBe(0)
    expect(normalizeRngValue(0)).toBe(0)
    expect(normalizeRngValue(0.5)).toBe(0.5)
    expect(normalizeRngValue(1)).toBeLessThan(1)
  })
})

describe('wheelGame angle math and visual contract', () => {
  const enabledSix = DEFAULT_WHEEL_ITEMS

  it('normalizes angles into [0, 360)', () => {
    expect(normalizeAngle(0)).toBe(0)
    expect(normalizeAngle(360)).toBe(0)
    expect(normalizeAngle(370)).toBe(10)
    expect(normalizeAngle(-10)).toBe(350)
  })

  it('maps segment center angles clockwise from top without -90 offset', () => {
    const slice = 360 / 6
    expect(computeSegmentCenterAngle(enabledSix, 'drink-50')).toBe(slice * 0.5)
    expect(computeSegmentCenterAngle(enabledSix, 'double')).toBe(slice * 5.5)
  })

  it('aligns layout centers, gradient stops, and label transforms to the same source', () => {
    const layouts = computeSegmentLayouts(enabledSix)
    const stops = buildConicGradientStops(enabledSix, () => '#f00')

    expect(layouts[0]?.startDeg).toBe(0)
    expect(stops).toContain('0deg')
    expect(stops).not.toContain('from -90deg')
    expect(computeRadialLabelLayout(layouts[0]?.centerDeg ?? 0).containerTransform).toContain(
      `${layouts[0]?.centerDeg ?? 0}deg`,
    )
    expect(layouts[0]?.centerDeg).toBe(computeSegmentCenterAngle(enabledSix, 'drink-50'))
  })

  it('places winner segment center under the fixed top pointer after target rotation', () => {
    for (const item of getEnabledItems(enabledSix)) {
      const center = computeSegmentCenterAngle(enabledSix, item.id)
      const target = computeTargetRotation(0, item.id, enabledSix, 0)
      expect(pointerAlignmentAfterRotation(center, target)).toBe(0)
    }
  })

  it('computes target rotation with minimum full spins from zero', () => {
    const slice = 360 / 6
    const center = slice * 0.5
    const target = computeTargetRotation(0, 'drink-50', enabledSix, WHEEL_CONFIG.minFullSpins)

    expect(target).toBeGreaterThanOrEqual(WHEEL_CONFIG.minFullSpins * 360)
    expect(pointerAlignmentAfterRotation(center, target)).toBe(0)
  })

  it('sanitizes non-finite current rotation to zero baseline', () => {
    const center = computeSegmentCenterAngle(enabledSix, 'drink-50')
    const fromNan = computeTargetRotation(Number.NaN, 'drink-50', enabledSix, 0)
    const fromInf = computeTargetRotation(Number.POSITIVE_INFINITY, 'drink-50', enabledSix, 0)

    expect(pointerAlignmentAfterRotation(center, fromNan)).toBe(0)
    expect(pointerAlignmentAfterRotation(center, fromInf)).toBe(0)
  })

  it('handles negative and cumulative current rotation', () => {
    const negativeBase = computeTargetRotation(-45, 'drink-100', enabledSix, 1)
    expect(negativeBase).toBeGreaterThan(-45)

    const first = computeTargetRotation(0, 'drink-50', enabledSix, 3)
    const second = computeTargetRotation(first, 'double', enabledSix, 3)
    expect(second).toBeGreaterThan(first)
    expect(
      pointerAlignmentAfterRotation(
        computeSegmentCenterAngle(enabledSix, 'double'),
        second,
      ),
    ).toBe(0)
  })

  it('builds spin plan with winner before animation rotation', () => {
    const plan = computeSpinPlan(() => 0, enabledSix, 180, 3)

    expect(plan.winnerId).toBe('drink-50')
    expect(plan.winnerLabel).toBe('Uống 50%')
    expect(plan.targetRotation).toBeGreaterThan(180)
  })
})

describe('wheelGame id generation and editor validation', () => {
  it('slugifies Vietnamese labels and handles empty slug', () => {
    expect(slugifyLabel('Đồng khởi')).toBe('dong-khoi')
    expect(slugifyLabel('   !!!   ')).toBe('item')
  })

  it('generates deterministic unique ids with suffix on collision', () => {
    const items: WheelItem[] = [{ id: 'uong-50', label: 'Uống 50%', enabled: true }]
    expect(generateUniqueItemId('Uống 50%', items)).toBe('uong-50-2')
    expect(generateUniqueItemId('Uống 50%', items, 'uong-50')).toBe('uong-50')
  })

  it('builds items from draft preserving id on edit', () => {
    const items = cloneDefaultItems()
    const created = buildItemFromDraft({ label: 'Thử mới', enabled: true }, items, null)
    expect(created?.id).toBe('thu-moi')

    const edited = buildItemFromDraft(
      { label: 'Uống 50% mới', enabled: false },
      items,
      'drink-50',
    )
    expect(edited).toEqual({ id: 'drink-50', label: 'Uống 50% mới', enabled: false })
  })

  it('validates label trim, non-empty, and max length', () => {
    expect(validateEditorDraft({ label: '  ok  ', enabled: true }).valid).toBe(true)
    expect(validateEditorDraft({ label: '   ', enabled: true }).valid).toBe(false)
    expect(
      validateEditorDraft({ label: 'x'.repeat(WHEEL_CONFIG.maxLabelLength + 1), enabled: true })
        .valid,
    ).toBe(false)
  })
})

describe('wheelGame validation and CRUD', () => {
  it('validates persisted runtime data shape including empty list', () => {
    expect(isValidPersistedItems(null)).toBe(false)
    expect(isValidPersistedItems([])).toBe(true)
    expect(isValidPersistedItems([{ id: 'a', label: 'A', enabled: true }])).toBe(true)
    expect(isValidPersistedItems([{ id: '', label: 'A', enabled: true }])).toBe(false)
    expect(isValidPersistedItems([{ id: 'a', label: 'A' }])).toBe(false)
  })

  it('parses persisted items or falls back to defaults without throwing', () => {
    expect(parsePersistedItems(undefined)).toEqual(DEFAULT_WHEEL_ITEMS)
    expect(parsePersistedItems('{bad json')).toEqual(DEFAULT_WHEEL_ITEMS)
    expect(parsePersistedItems([])).toEqual([])
    expect(parsePersistedItems([{ id: 'custom', label: 'Custom', enabled: true }])).toEqual([
      { id: 'custom', label: 'Custom', enabled: true },
    ])
  })

  it('detects duplicate ids in item lists', () => {
    expect(
      validateItemsUniqueIds([
        { id: 'a', label: 'A', enabled: true },
        { id: 'a', label: 'B', enabled: true },
      ]),
    ).toBe(false)
  })

  it('rejects duplicate add instead of mutating list', () => {
    const items = cloneDefaultItems()
    const duplicate = tryAddItem(items, { id: 'drink-50', label: 'Dup', enabled: true })
    expect(duplicate).toBeNull()
  })

  it('supports try* CRUD mutations', () => {
    let items = cloneDefaultItems()
    const added = tryAddItem(items, { id: 'new', label: 'New', enabled: true })
    expect(added?.some((item) => item.id === 'new')).toBe(true)
    items = added ?? items

    const updated = tryUpdateItem(items, 'new', { label: 'Updated' })
    expect(updated?.find((item) => item.id === 'new')?.label).toBe('Updated')
    items = updated ?? items

    const toggled = tryToggleItemEnabled(items, 'new')
    expect(toggled?.find((item) => item.id === 'new')?.enabled).toBe(false)
    items = toggled ?? items

    const deleted = tryDeleteItem(items, 'new')
    expect(deleted?.some((item) => item.id === 'new')).toBe(false)

    expect(resetItemsToDefaults()).toEqual(DEFAULT_WHEEL_ITEMS)
  })

  it('returns null when replacing a nonexistent item id', () => {
    const items = cloneDefaultItems()
    expect(
      tryReplaceItem(items, 'missing-id', { id: 'missing-id', label: 'X', enabled: true }),
    ).toBeNull()
  })
})

describe('wheelGame radial label layout and aria', () => {
  it('returns container and counter transforms for radial placement', () => {
    const layout = computeRadialLabelLayout(30)
    expect(layout.containerTransform).toBe('rotate(30deg)')
    expect(layout.textTransform).toBe('translateX(-50%) rotate(-30deg)')
    expect(layout.topPercent).toBeGreaterThanOrEqual(8)
    expect(layout.topPercent).toBeLessThanOrEqual(12)
  })

  it('builds aria label from enabled labels with clamp', () => {
    const many = Array.from({ length: 10 }, (_, index) => ({
      id: `item-${index}`,
      label: `Mục ${index + 1}`,
      enabled: true,
    }))
    const label = buildWheelAriaLabel(many, 8)
    expect(label).toContain('Mục 1')
    expect(label).toContain('Mục 8')
    expect(label).toContain('2 mục khác')
    expect(label).not.toContain('Mục 9')
  })

  it('describes empty wheel for aria', () => {
    expect(buildWheelAriaLabel([])).toBe('Vòng quay trống')
  })
})

describe('wheelGame spin guards', () => {
  it('blocks spin when fewer than two items are enabled', () => {
    const items = DEFAULT_WHEEL_ITEMS.map((item, index) => ({
      ...item,
      enabled: index === 0,
    }))
    expect(
      getSpinBlockReason({ phase: 'idle', items, editorOpen: false, editorInvalid: false }),
    ).toBe('too-few-enabled')
  })

  it('blocks spin while spinning, editor open, or editor invalid', () => {
    expect(
      getSpinBlockReason({
        phase: 'spinning',
        items: DEFAULT_WHEEL_ITEMS,
        editorOpen: false,
        editorInvalid: false,
      }),
    ).toBe('spinning')

    expect(
      getSpinBlockReason({
        phase: 'idle',
        items: DEFAULT_WHEEL_ITEMS,
        editorOpen: true,
        editorInvalid: false,
      }),
    ).toBe('editor-open')

    expect(
      getSpinBlockReason({
        phase: 'idle',
        items: DEFAULT_WHEEL_ITEMS,
        editorOpen: true,
        editorInvalid: true,
      }),
    ).toBe('editor-invalid')
  })

  it('allows spin when at least two enabled and idle with editor closed', () => {
    expect(
      getSpinBlockReason({
        phase: 'idle',
        items: DEFAULT_WHEEL_ITEMS,
        editorOpen: false,
        editorInvalid: false,
      }),
    ).toBeNull()
  })
})
