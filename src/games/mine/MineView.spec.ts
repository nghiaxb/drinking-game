import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MineView from './MineView.vue'

vi.mock('@/composables/useGameFeedback', () => ({
  useGameFeedback: () => ({
    playClick: vi.fn(),
    playExplosion: vi.fn(),
    vibrateLight: vi.fn(),
    vibrateHeavy: vi.fn(),
    primeAudio: vi.fn(),
  }),
}))

vi.mock('./composables/useMineGame', () => {
  const phase = { value: 'playing' as 'playing' | 'exploded' }
  const revealedIndices = { value: [] as number[] }
  const mineIndices = { value: [12] as number[] }
  const hitMineIndex = { value: null as number | null }
  const isTerminal = { value: false }
  const reset = vi.fn()
  const pressCell = vi.fn().mockResolvedValue(undefined)
  const primeAudio = vi.fn()

  return {
    useMineGame: () => ({
      phase,
      revealedIndices,
      mineIndices,
      hitMineIndex,
      gridSize: { value: 5 },
      mineCount: { value: 1 },
      isTerminal,
      isCellDisabled: (index: number) =>
        isTerminal.value || revealedIndices.value.includes(index),
      pressCell,
      reset,
      primeAudio,
    }),
    __testControls: {
      phase,
      revealedIndices,
      mineIndices,
      hitMineIndex,
      isTerminal,
      reset,
      pressCell,
      primeAudio,
    },
  }
})

describe('MineView', () => {
  it('renders game surface with 25 cell controls', () => {
    const wrapper = mount(MineView)

    const root = wrapper.get('[data-testid="mine-view"]')
    expect(root.classes()).toContain('game-surface')
    expect(root.classes()).toContain('overflow-x-hidden')
    expect(wrapper.findAll('button[data-testid^="mine-cell-"]')).toHaveLength(25)
  })

  it('disables revealed cells', async () => {
    const mod = await import('./composables/useMineGame')
    const controls = mod as typeof mod & {
      __testControls: {
        revealedIndices: { value: number[] }
      }
    }
    controls.__testControls.revealedIndices.value = [2]

    const wrapper = mount(MineView)
    const cell = wrapper.get('[data-testid="mine-cell-2"]')

    expect((cell.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('primes audio on first cell press before handling the press', async () => {
    const mod = await import('./composables/useMineGame')
    const controls = mod as typeof mod & {
      __testControls: {
        primeAudio: ReturnType<typeof vi.fn>
        pressCell: ReturnType<typeof vi.fn>
      }
    }

    controls.__testControls.primeAudio.mockClear()
    controls.__testControls.pressCell.mockClear()

    const wrapper = mount(MineView)
    await wrapper.get('[data-testid="mine-cell-0"]').trigger('click')

    expect(controls.__testControls.primeAudio).toHaveBeenCalledTimes(1)
    expect(controls.__testControls.pressCell).toHaveBeenCalledTimes(1)
    expect(controls.__testControls.primeAudio.mock.invocationCallOrder[0]).toBeLessThan(
      controls.__testControls.pressCell.mock.invocationCallOrder[0] ?? 0,
    )
  })

  it('shows explosion result and locks controls when terminal', async () => {
    const mod = await import('./composables/useMineGame')
    const controls = mod as typeof mod & {
      __testControls: {
        phase: { value: 'playing' | 'exploded' }
        isTerminal: { value: boolean }
        hitMineIndex: { value: number | null }
        revealedIndices: { value: number[] }
      }
    }
    controls.__testControls.phase.value = 'exploded'
    controls.__testControls.isTerminal.value = true
    controls.__testControls.hitMineIndex.value = 12
    controls.__testControls.revealedIndices.value = [12]

    const wrapper = mount(MineView)

    expect(wrapper.get('[data-testid="mine-result"]').text()).toContain('TRÚNG MÌN')
    expect(wrapper.get('[data-testid="mine-result"]').text()).toContain('UỐNG')
    expect(wrapper.get('[data-testid="mine-status-live"]').text()).toContain('Trúng mìn')

    for (const cell of wrapper.findAll('button[data-testid^="mine-cell-"]')) {
      expect((cell.element as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('calls reset when replay is pressed', async () => {
    const mod = await import('./composables/useMineGame')
    const controls = mod as typeof mod & {
      __testControls: {
        phase: { value: 'playing' | 'exploded' }
        isTerminal: { value: boolean }
        reset: ReturnType<typeof vi.fn>
      }
    }
    controls.__testControls.phase.value = 'exploded'
    controls.__testControls.isTerminal.value = true

    const wrapper = mount(MineView)

    await wrapper.get('[data-testid="mine-replay"]').trigger('click')

    expect(controls.__testControls.reset).toHaveBeenCalled()
  })
})
