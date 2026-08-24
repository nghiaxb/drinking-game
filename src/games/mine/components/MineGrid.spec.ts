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
    expect(group.attributes('aria-label')).toContain('Lưới mìn')
    expect(wrapper.findAll('button[data-testid^="mine-cell-"]')).toHaveLength(25)
    expect(wrapper.get('[data-testid="mine-cell-0"]').attributes('role')).toBeUndefined()
  })

  it('does not expose mine markers in the DOM before explosion', () => {
    const wrapper = mount(MineGrid, { props: defaultProps })

    expect(wrapper.text()).not.toContain('💣')
    expect(wrapper.get('[data-testid="mine-cell-12"]').text()).toBe('')
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
    expect(cell.text()).toContain('✓')
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
    expect(hitCell.text()).toContain('💣')
  })

  it('uses tactile layout classes for 320px fit with 8px gaps and 44px cells', () => {
    const wrapper = mount(MineGrid, { props: defaultProps })

    const grid = wrapper.get('[data-testid="mine-grid"]')
    expect(grid.classes()).toContain('gap-2')
    expect(grid.classes()).toContain('max-w-[min(100%,20rem)]')
    expect(wrapper.html()).toContain('--mine-cell-min')
  })

  it('keeps explosion peak scale within horizontal padding budget at 320px', () => {
    const gridMaxPx = 320
    const gapPx = 8
    const cols = 5
    const stagePaddingPx = 4
    const explosionPeakScale = 1.12

    const cellPx = (gridMaxPx - (cols - 1) * gapPx) / cols
    const peakOverflowPx = (cellPx * explosionPeakScale - cellPx) / 2

    expect(cellPx).toBeGreaterThanOrEqual(44)
    expect(peakOverflowPx).toBeLessThanOrEqual(stagePaddingPx)
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
