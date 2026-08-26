import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MineGrid from './MineGrid.vue'

describe('MineGrid', () => {
  const defaultProps = {
    gridSize: 5,
    revealedIndices: [] as number[],
    disabledIndices: [] as number[],
    mineIndices: [12] as number[],
    hitMineIndex: null as number | null,
    exploded: false,
  }

  it('renders a 5x5 button group of cell controls', () => {
    const wrapper = mount(MineGrid, { props: defaultProps })

    const group = wrapper.get('[data-testid="mine-grid"]')
    expect(group.attributes('role')).toBe('group')
    expect(group.attributes('aria-label')).toContain('Lưới ếch')
    expect(wrapper.findAll('button[data-testid^="mine-cell-"]')).toHaveLength(25)
    expect(wrapper.get('[data-testid="mine-cell-0"]').attributes('role')).toBeUndefined()
  })

  it('does not expose mine markers in the DOM before explosion', () => {
    const wrapper = mount(MineGrid, { props: defaultProps })

    // Only the idle frog exists while playing, so the penalty cell looks like every other one.
    expect(wrapper.findAll('.frog--crying')).toHaveLength(0)
    expect(wrapper.findAll('.frog--idle')).toHaveLength(25)
  })

  it('shows safe state for revealed non-mine cells', () => {
    const wrapper = mount(MineGrid, {
      props: {
        ...defaultProps,
        revealedIndices: [0],
        disabledIndices: [0],
      },
    })

    const cell = wrapper.get('[data-testid="mine-cell-0"]')
    expect(cell.classes()).toContain('mine-cell--safe')
    // A caught frog is gone from the board entirely.
    expect(cell.find('.frog').exists()).toBe(false)
    expect(wrapper.findAll('.frog--idle')).toHaveLength(24)
    expect((cell.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows mine state when exploded', () => {
    const wrapper = mount(MineGrid, {
      props: {
        ...defaultProps,
        revealedIndices: [12],
        disabledIndices: Array.from({ length: 25 }, (_, i) => i),
        hitMineIndex: 12,
        exploded: true,
      },
    })

    const hitCell = wrapper.get('[data-testid="mine-cell-12"]')
    expect(hitCell.classes()).toContain('mine-cell--mine')
    expect(hitCell.classes()).toContain('mine-cell--exploded')
    expect(hitCell.find('.frog--crying').exists()).toBe(true)
  })

  it('uses tactile layout classes for 320px fit with 8px gaps and 44px cells', () => {
    const wrapper = mount(MineGrid, { props: defaultProps })

    const grid = wrapper.get('[data-testid="mine-grid"]')
    expect(grid.classes()).toContain('gap-2')
    expect(grid.classes()).toContain('max-w-[min(100%,20rem)]')
    expect(wrapper.html()).toContain('--mine-cell-min')
  })

  it('keeps explosion peak and blast ring inside the tray padding at 320px', () => {
    const viewportPx = 320
    const sectionPaddingPx = 4
    const trayPaddingPx = 9.6
    const gapPx = 8
    const cols = 5
    const explosionPeakScale = 1.12
    const blastRingInsetPx = 5.6

    const gridPx = viewportPx - sectionPaddingPx * 2 - trayPaddingPx * 2
    const cellPx = (gridPx - (cols - 1) * gapPx) / cols
    const peakOverflowPx = (cellPx * explosionPeakScale - cellPx) / 2

    expect(cellPx).toBeGreaterThanOrEqual(44)
    // The tray padding is what absorbs both, so neither can push the grid past the viewport.
    expect(peakOverflowPx).toBeLessThanOrEqual(trayPaddingPx)
    expect(blastRingInsetPx).toBeLessThanOrEqual(trayPaddingPx)
  })

  it('provides descriptive aria labels for cells', () => {
    const wrapper = mount(MineGrid, {
      props: {
        ...defaultProps,
        revealedIndices: [0],
        disabledIndices: [0],
        exploded: false,
      },
    })

    expect(wrapper.get('[data-testid="mine-cell-0"]').attributes('aria-label')).toContain('an toàn')
  })
})
