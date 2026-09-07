import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { BombPhase } from './types'
import BombView from './BombView.vue'

vi.mock('@/services/storage', () => ({
  storage: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
  },
}))

vi.mock('@/composables/useGameFeedback', () => ({
  useGameFeedback: () => ({
    playClick: vi.fn(),
    playTick: vi.fn(),
    playExplosion: vi.fn(),
    vibrateLight: vi.fn(),
    vibrateHeavy: vi.fn(),
    primeAudio: vi.fn(),
  }),
}))

const phase = { value: 'idle' as BombPhase }
const currentTopic = { value: null as { id: string; category: string; text: string } | null }
const passes = { value: 0 }
const canReplay = { value: false }
const fuseRange = { value: { minMs: 15_000, maxMs: 35_000 } }
const start = vi.fn().mockReturnValue(true)
const pass = vi.fn()
const dispose = vi.fn()
const load = vi.fn().mockResolvedValue(undefined)
const setMin = vi.fn()
const setMax = vi.fn()
const saveFuseRange = vi.fn().mockResolvedValue(undefined)

vi.mock('./composables/useBombGame', () => ({
  useBombGame: () => ({
    phase,
    currentTopic,
    passes,
    topicCount: { value: 121 },
    tickIntervalMs: { value: 720 },
    fuseRange,
    canReplay,
    load,
    setMin,
    setMax,
    saveFuseRange,
    start,
    pass,
    dispose,
  }),
}))

function reset(next: Partial<{ phase: BombPhase; passes: number; canReplay: boolean }> = {}): void {
  phase.value = next.phase ?? 'idle'
  passes.value = next.passes ?? 0
  canReplay.value = next.canReplay ?? false
  currentTopic.value =
    phase.value === 'idle'
      ? null
      : { id: 'party-01', category: 'party', text: 'Kể tên lý do đi nhậu' }
  fuseRange.value = { minMs: 15_000, maxMs: 35_000 }
  start.mockClear()
  pass.mockClear()
  dispose.mockClear()
  load.mockClear()
  setMin.mockClear()
  setMax.mockClear()
  saveFuseRange.mockClear()
}

describe('BombView', () => {
  it('shows the rules and topic count before the first round', () => {
    reset()
    const wrapper = mount(BombView)

    expect(wrapper.find('[data-testid="bomb-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bomb-intro"]').text()).toContain('121 chủ đề')
    expect(wrapper.find('[data-testid="bomb-start"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bomb-stage"]').exists()).toBe(false)
  })

  it('starts a round from the start button', async () => {
    reset()
    const wrapper = mount(BombView)

    await wrapper.find('[data-testid="bomb-start"]').trigger('click')
    expect(start).toHaveBeenCalledTimes(1)
  })

  it('shows the topic and its category while the fuse burns, but never the fuse', () => {
    reset({ phase: 'running', passes: 3 })
    const wrapper = mount(BombView)

    expect(wrapper.find('[data-testid="bomb-topic"]').text()).toBe('Kể tên lý do đi nhậu')
    expect(wrapper.find('[data-testid="bomb-category"]').text()).toBe('Bàn nhậu')
    expect(wrapper.find('[data-testid="bomb-passes"]').text()).toContain('3 lượt')
    expect(wrapper.find('[data-testid="bomb-stage"]').text()).toContain('????')
    expect(wrapper.find('[data-testid="bomb-result"]').exists()).toBe(false)
  })

  it('passes the bomb on from the pass button', async () => {
    reset({ phase: 'running' })
    const wrapper = mount(BombView)

    await wrapper.find('[data-testid="bomb-pass"]').trigger('click')
    expect(pass).toHaveBeenCalledTimes(1)
  })

  it('announces the drink and hides the pass button after the blast', () => {
    reset({ phase: 'exploded', passes: 6 })
    const wrapper = mount(BombView)

    expect(wrapper.find('[data-testid="bomb-result"]').text()).toContain('UỐNG!')
    expect(wrapper.find('[data-testid="bomb-pass"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="bomb-status-live"]').text()).toContain('6 lượt')
  })

  it('disables replay until the grace window closes', () => {
    reset({ phase: 'exploded', canReplay: false })
    const locked = mount(BombView)
    expect(locked.find('[data-testid="bomb-replay"]').attributes('disabled')).toBeDefined()

    reset({ phase: 'exploded', canReplay: true })
    const ready = mount(BombView)
    expect(ready.find('[data-testid="bomb-replay"]').attributes('disabled')).toBeUndefined()
  })

  it('shows the fuse window and loads the stored one on mount', () => {
    reset()
    const wrapper = mount(BombView)

    expect(load).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="bomb-fuse"]').text()).toContain('15–35 giây')
    expect(wrapper.find('[data-testid="bomb-fuse-min"]').attributes('value')).toBe('15000')
    expect(wrapper.find('[data-testid="bomb-fuse-max"]').attributes('value')).toBe('35000')
  })

  /*
   * Driven by raw input/change rather than setValue, which fires both at once and so cannot tell
   * a drag step from the release — the split is the whole point of saving on change.
   */
  it('moves the window on every drag step but saves only on release', async () => {
    reset()
    const wrapper = mount(BombView)
    const min = wrapper.find('[data-testid="bomb-fuse-min"]')

    for (const value of ['20000', '25000', '30000']) {
      ;(min.element as HTMLInputElement).value = value
      await min.trigger('input')
    }

    expect(setMin).toHaveBeenCalledTimes(3)
    expect(setMin).toHaveBeenLastCalledWith(30_000)
    expect(saveFuseRange).not.toHaveBeenCalled()

    await min.trigger('change')
    expect(saveFuseRange).toHaveBeenCalledTimes(1)

    const max = wrapper.find('[data-testid="bomb-fuse-max"]')
    ;(max.element as HTMLInputElement).value = '60000'
    await max.trigger('input')
    expect(setMax).toHaveBeenCalledWith(60_000)
  })

  /* The running screen is topic, bomb and pass button only — the window is agreed beforehand. */
  it('hides the fuse sliders while the bomb is burning', () => {
    reset({ phase: 'running' })
    const burning = mount(BombView)
    expect(burning.find('[data-testid="bomb-fuse"]').exists()).toBe(false)

    reset({ phase: 'exploded', canReplay: true })
    const blown = mount(BombView)
    expect(blown.find('[data-testid="bomb-fuse"]').exists()).toBe(true)
  })

  /*
   * The base layer hands every non-checkbox input `touch-action: auto`, which is meant for text
   * fields and would give a slider double-tap zoom back. It has to be overridden here.
   */
  it('keeps double-tap zoom off the sliders', () => {
    reset()
    const wrapper = mount(BombView)

    for (const id of ['bomb-fuse-min', 'bomb-fuse-max']) {
      expect(wrapper.find(`[data-testid="${id}"]`).classes()).toContain('bomb-fuse__slider')
    }
  })

  it('releases its timers when the view is torn down', () => {
    reset({ phase: 'running' })
    const wrapper = mount(BombView)

    wrapper.unmount()
    expect(dispose).toHaveBeenCalledTimes(1)
  })
})
