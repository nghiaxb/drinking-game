import { afterEach, describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CrocodileView from './CrocodileView.vue'

vi.mock('@/composables/useGameFeedback', () => ({
  useGameFeedback: () => ({
    playClick: vi.fn(),
    playChomp: vi.fn(),
    vibrateLight: vi.fn(),
    vibrateHeavy: vi.fn(),
    primeAudio: vi.fn(),
  }),
}))

vi.mock('./composables/useCrocodileGame', () => {
  const phase = { value: 'playing' as 'playing' | 'bitten' }
  const pressedIndices = { value: [] as number[] }
  const isTerminal = { value: false }
  const jawClosed = { value: false }
  const reset = vi.fn()
  const pressTooth = vi.fn().mockResolvedValue(undefined)
  const primeAudio = vi.fn()

  return {
    useCrocodileGame: () => ({
      phase,
      pressedIndices,
      isTerminal,
      jawClosed,
      toothCount: { value: 12 },
      upperRowCount: { value: 0 },
      lowerRowCount: { value: 12 },
      isToothDisabled: (index: number) => isTerminal.value || pressedIndices.value.includes(index),
      pressTooth,
      reset,
      primeAudio,
    }),
    __testControls: { phase, pressedIndices, isTerminal, jawClosed, reset, pressTooth, primeAudio },
  }
})

describe('CrocodileView', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders game surface with twelve lower-jaw tooth controls', () => {
    const wrapper = mount(CrocodileView)

    const root = wrapper.get('[data-testid="crocodile-view"]')
    expect(root.classes()).toContain('game-surface')
    expect(root.classes()).not.toContain('overflow-hidden')
    expect(root.classes()).toContain('crocodile-view--scroll-y')
    expect(wrapper.findAll('button[data-testid^="crocodile-tooth-"]')).toHaveLength(12)
  })

  it('wraps toy in full-bleed stage contract for parent padding breakout', () => {
    const wrapper = mount(CrocodileView)
    const stage = wrapper.get('[data-testid="crocodile-stage"]')

    expect(stage.classes()).toContain('crocodile-stage')
    expect(stage.classes()).toContain('crocodile-stage--responsive')
    expect(stage.attributes('data-full-bleed-breakpoint-px')).toBe('400')
  })

  it('disables pressed teeth', async () => {
    const mod = await import('./composables/useCrocodileGame')
    const controls = mod as typeof mod & {
      __testControls: {
        pressedIndices: { value: number[] }
      }
    }
    controls.__testControls.pressedIndices.value = [2]

    const wrapper = mount(CrocodileView)
    const tooth = wrapper.get('[data-testid="crocodile-tooth-2"]')

    expect((tooth.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('primes audio on first tooth press before handling the press', async () => {
    const mod = await import('./composables/useCrocodileGame')
    const controls = mod as typeof mod & {
      __testControls: {
        primeAudio: ReturnType<typeof vi.fn>
        pressTooth: ReturnType<typeof vi.fn>
      }
    }

    controls.__testControls.primeAudio.mockClear()
    controls.__testControls.pressTooth.mockClear()

    const wrapper = mount(CrocodileView)
    await wrapper.get('[data-testid="crocodile-tooth-0"]').trigger('click')

    expect(controls.__testControls.primeAudio).toHaveBeenCalledTimes(1)
    expect(controls.__testControls.pressTooth).toHaveBeenCalledTimes(1)
    expect(controls.__testControls.primeAudio.mock.invocationCallOrder[0]).toBeLessThan(
      controls.__testControls.pressTooth.mock.invocationCallOrder[0] ?? 0,
    )
  })

  it('shows bite result after the jaw impact and locks controls immediately', async () => {
    vi.useFakeTimers()
    const mod = await import('./composables/useCrocodileGame')
    const controls = mod as typeof mod & {
      __testControls: {
        phase: { value: 'playing' | 'bitten' }
        isTerminal: { value: boolean }
        jawClosed: { value: boolean }
      }
    }
    controls.__testControls.phase.value = 'bitten'
    controls.__testControls.isTerminal.value = true
    controls.__testControls.jawClosed.value = true

    const wrapper = mount(CrocodileView)

    expect(wrapper.find('[data-testid="crocodile-result"]').exists()).toBe(false)

    const delayMs = Number(
      wrapper.get('[data-testid="crocodile-view"]').attributes('data-result-delay-ms'),
    )
    await vi.advanceTimersByTimeAsync(delayMs)
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-testid="crocodile-result"]').text()).toContain('CÁ SẤU CẮN')
    expect(wrapper.get('[data-testid="crocodile-result"]').text()).toContain('UỐNG')

    for (const tooth of wrapper.findAll('button[data-testid^="crocodile-tooth-"]')) {
      expect((tooth.element as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('calls reset when replay is pressed', async () => {
    vi.useFakeTimers()
    const mod = await import('./composables/useCrocodileGame')
    const controls = mod as typeof mod & {
      __testControls: {
        phase: { value: 'playing' | 'bitten' }
        isTerminal: { value: boolean }
        jawClosed: { value: boolean }
        reset: ReturnType<typeof vi.fn>
      }
    }
    controls.__testControls.phase.value = 'bitten'
    controls.__testControls.isTerminal.value = true
    controls.__testControls.jawClosed.value = true

    const wrapper = mount(CrocodileView)

    const delayMs = Number(
      wrapper.get('[data-testid="crocodile-view"]').attributes('data-result-delay-ms'),
    )
    await vi.advanceTimersByTimeAsync(delayMs)
    await wrapper.vm.$nextTick()

    await wrapper.get('[data-testid="crocodile-replay"]').trigger('click')

    expect(controls.__testControls.reset).toHaveBeenCalled()
  })
})
