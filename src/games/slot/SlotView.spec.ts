import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SlotView from './SlotView.vue'

vi.mock('@/composables/useGameFeedback', () => ({
  useGameFeedback: () => ({
    playSpin: vi.fn(),
    playWin: vi.fn(),
    playLose: vi.fn(),
    vibrateLight: vi.fn(),
    vibrateHeavy: vi.fn(),
    primeAudio: vi.fn(),
  }),
}))

vi.mock('./composables/useSlotGame', () => {
  const phase = { value: 'idle' as 'idle' | 'spinning' | 'result' }
  const rewardLabel = { value: null as string | null }
  const outcome = { value: null as 'jackpot' | 'pair' | 'miss' | null }
  const isJackpot = { value: false }
  const isSpinning = { value: false }
  const displaySymbols = { value: ['beer', 'skull', 'dice'] as const }
  const stoppedReels = { value: [true, true, true] as [boolean, boolean, boolean] }
  const spin = vi.fn().mockResolvedValue(true)
  const dismissResult = vi.fn()
  const dispose = vi.fn()

  return {
    useSlotGame: () => ({
      phase,
      symbols: { value: null },
      displaySymbols,
      stoppedReels,
      outcome,
      rewardLabel,
      isJackpot,
      pendingPlan: { value: null },
      isSpinning,
      spin,
      dismissResult,
      dispose,
    }),
    __testControls: {
      phase,
      rewardLabel,
      outcome,
      isJackpot,
      isSpinning,
      spin,
      dismissResult,
    },
  }
})

describe('SlotView', () => {
  beforeEach(async () => {
    const mod = await import('./composables/useSlotGame')
    const controls = mod as typeof mod & {
      __testControls: {
        phase: { value: 'idle' | 'spinning' | 'result' }
        rewardLabel: { value: string | null }
        outcome: { value: 'jackpot' | 'pair' | 'miss' | null }
        isJackpot: { value: boolean }
        isSpinning: { value: boolean }
        spin: ReturnType<typeof vi.fn>
        dismissResult: ReturnType<typeof vi.fn>
      }
    }
    controls.__testControls.phase.value = 'idle'
    controls.__testControls.rewardLabel.value = null
    controls.__testControls.outcome.value = null
    controls.__testControls.isJackpot.value = false
    controls.__testControls.isSpinning.value = false
    controls.__testControls.spin.mockClear()
    controls.__testControls.dismissResult.mockClear()
  })

  it('renders centered slot stage with three reels and lever', () => {
    const wrapper = mount(SlotView)

    expect(wrapper.get('[data-testid="slot-view"]').classes()).toContain('game-surface')
    expect(wrapper.find('[data-testid="slot-reels"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="slot-lever"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="slot-status-live"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="slot-status-live"]').text()).toContain('Sẵn sàng kéo cần')
  })

  it('locks lever while spinning', async () => {
    const mod = await import('./composables/useSlotGame')
    const controls = mod as typeof mod & {
      __testControls: { isSpinning: { value: boolean } }
    }
    controls.__testControls.isSpinning.value = true

    const wrapper = mount(SlotView)
    const lever = wrapper.get('[data-testid="slot-lever"]')

    expect((lever.element as HTMLButtonElement).disabled).toBe(true)
    expect(lever.attributes('aria-busy')).toBe('true')
    expect(wrapper.find('[data-testid="slot-result"]').exists()).toBe(false)
  })

  it('shows result panel only after result phase', async () => {
    const mod = await import('./composables/useSlotGame')
    const controls = mod as typeof mod & {
      __testControls: {
        phase: { value: 'idle' | 'spinning' | 'result' }
        rewardLabel: { value: string | null }
        outcome: { value: 'jackpot' | 'pair' | 'miss' | null }
        isJackpot: { value: boolean }
      }
    }
    controls.__testControls.phase.value = 'result'
    controls.__testControls.rewardLabel.value = 'Uống 3 ngụm'
    controls.__testControls.outcome.value = 'jackpot'
    controls.__testControls.isJackpot.value = true

    const wrapper = mount(SlotView)
    expect(wrapper.get('[data-testid="slot-result"]').text()).toContain('Uống 3 ngụm')
  })

  it('delegates lever click only to spin without duplicate priming', async () => {
    const mod = await import('./composables/useSlotGame')
    const controls = mod as typeof mod & {
      __testControls: { spin: ReturnType<typeof vi.fn> }
    }

    const wrapper = mount(SlotView)
    await wrapper.get('[data-testid="slot-lever"]').trigger('click')

    expect(controls.__testControls.spin).toHaveBeenCalledTimes(1)
  })

  it('replay dismisses result then spins again', async () => {
    const mod = await import('./composables/useSlotGame')
    const controls = mod as typeof mod & {
      __testControls: {
        phase: { value: 'idle' | 'spinning' | 'result' }
        rewardLabel: { value: string | null }
        outcome: { value: 'jackpot' | 'pair' | 'miss' | null }
        isJackpot: { value: boolean }
        spin: ReturnType<typeof vi.fn>
        dismissResult: ReturnType<typeof vi.fn>
      }
    }
    controls.__testControls.phase.value = 'result'
    controls.__testControls.rewardLabel.value = 'Uống 3 ngụm'
    controls.__testControls.outcome.value = 'jackpot'
    controls.__testControls.isJackpot.value = true

    const wrapper = mount(SlotView)
    await wrapper.get('[data-testid="slot-replay"]').trigger('click')

    expect(controls.__testControls.dismissResult).toHaveBeenCalledTimes(1)
    expect(controls.__testControls.spin).toHaveBeenCalledTimes(1)
  })
})
