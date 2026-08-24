import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import PreferMotionHarness from './PreferMotionHarness.vue'
import { readPrefersReducedMotion } from './usePrefersReducedMotion'

describe('usePrefersReducedMotion', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('reads reduced motion preference safely', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )

    expect(readPrefersReducedMotion()).toBe(true)
    vi.unstubAllGlobals()
  })

  it('registers and cleans up media query listener', async () => {
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener,
        removeEventListener,
      }),
    )

    const wrapper = mount(PreferMotionHarness)
    await nextTick()
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    wrapper.unmount()
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    vi.unstubAllGlobals()
  })

  it('updates when media query change event fires', async () => {
    let changeHandler: (() => void) | undefined
    const media = {
      matches: false,
      addEventListener: vi.fn((_event: string, handler: () => void) => {
        changeHandler = handler
      }),
      removeEventListener: vi.fn(),
    }
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(media))

    const wrapper = mount(PreferMotionHarness)
    const harness = wrapper.get('[data-testid="prefer-motion-harness"]')

    await nextTick()
    expect(harness.attributes('data-reduced')).toBe('false')

    media.matches = true
    if (changeHandler) {
      changeHandler()
    }
    await nextTick()
    expect(harness.attributes('data-reduced')).toBe('true')

    vi.unstubAllGlobals()
  })
})
