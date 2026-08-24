import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import WheelView from './WheelView.vue'

vi.mock('@/composables/useGameFeedback', () => ({
  useGameFeedback: () => ({
    playTick: vi.fn(),
    playWin: vi.fn(),
    vibrateHeavy: vi.fn(),
    primeAudio: vi.fn(),
  }),
}))

vi.mock('@/services/storage', () => ({
  storage: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
  },
}))

vi.mock('./composables/useWheelGame', () => {
  const phase = { value: 'idle' as 'idle' | 'spinning' | 'result' }
  const items = {
    value: [
      { id: 'drink-50', label: 'Uống 50%', enabled: true },
      { id: 'drink-100', label: 'Uống 100%', enabled: true },
    ],
  }
  const rotation = { value: 0 }
  const winnerLabel = { value: null as string | null }
  const spinBlockReason = { value: null as string | null }
  const spinBlockMessage = { value: null as string | null }
  const isSpinning = { value: false }
  const editorOpen = { value: false }
  const editorDraft = { value: { label: '', enabled: true } }
  const editingId = { value: null as string | null }
  const editorValidation = { value: { valid: true, errors: [] } }
  const persistError = { value: null as string | null }
  const spinDurationMs = { value: 4000 }
  const spin = vi.fn().mockResolvedValue(true)
  const load = vi.fn().mockResolvedValue(undefined)
  const dispose = vi.fn()

  return {
    useWheelGame: () => ({
      phase,
      items,
      rotation,
      winnerId: { value: null },
      winnerLabel,
      pendingWinnerId: { value: null },
      spinBlockReason,
      spinBlockMessage,
      isSpinning,
      editorOpen,
      editorDraft,
      editingId,
      editorValidation,
      persistError,
      spinDurationMs,
      load,
      spin,
      dismissResult: vi.fn(),
      openEditor: vi.fn(),
      closeEditor: vi.fn(),
      startEdit: vi.fn(),
      setEditorDraft: vi.fn(),
      saveEditorDraft: vi.fn(),
      toggleItemEnabled: vi.fn(),
      deleteItem: vi.fn(),
      resetItems: vi.fn(),
      primeAudio: vi.fn(),
      dispose,
    }),
    __testControls: {
      phase,
      winnerLabel,
      spinBlockReason,
      spinBlockMessage,
      isSpinning,
      editorOpen,
      editorValidation,
      persistError,
      spin,
    },
  }
})

describe('WheelView', () => {
  beforeEach(async () => {
    const mod = await import('./composables/useWheelGame')
    const controls = mod as typeof mod & {
      __testControls: {
        phase: { value: 'idle' | 'spinning' | 'result' }
        winnerLabel: { value: string | null }
        spinBlockReason: { value: string | null }
        spinBlockMessage: { value: string | null }
        isSpinning: { value: boolean }
        persistError: { value: string | null }
        spin: ReturnType<typeof vi.fn>
      }
    }
    controls.__testControls.phase.value = 'idle'
    controls.__testControls.winnerLabel.value = null
    controls.__testControls.spinBlockReason.value = null
    controls.__testControls.spinBlockMessage.value = null
    controls.__testControls.isSpinning.value = false
    controls.__testControls.persistError.value = null
    controls.__testControls.spin.mockClear()
  })

  it('renders game surface with wheel disc and spin control', () => {
    const wrapper = mount(WheelView)

    expect(wrapper.get('[data-testid="wheel-view"]').classes()).toContain('game-surface')
    expect(wrapper.find('[data-testid="wheel-disc"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="wheel-pointer"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="wheel-spin-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="wheel-editor-id"]').exists()).toBe(false)
  })

  it('disables spin button and shows reason when blocked', async () => {
    const mod = await import('./composables/useWheelGame')
    const controls = mod as typeof mod & {
      __testControls: {
        spinBlockReason: { value: string | null }
        spinBlockMessage: { value: string | null }
      }
    }
    controls.__testControls.spinBlockReason.value = 'editor-open'
    controls.__testControls.spinBlockMessage.value = 'Đóng trình chỉnh sửa trước khi quay.'

    const wrapper = mount(WheelView)
    const button = wrapper.get('[data-testid="wheel-spin-button"]')

    expect((button.element as HTMLButtonElement).disabled).toBe(true)
    expect(wrapper.get('[data-testid="wheel-spin-block"]').text()).toContain('Đóng trình chỉnh sửa')
  })

  it('shows persist error alert', async () => {
    const mod = await import('./composables/useWheelGame')
    const controls = mod as typeof mod & {
      __testControls: { persistError: { value: string | null } }
    }
    controls.__testControls.persistError.value = 'Không thể lưu dữ liệu. Vui lòng thử lại.'

    const wrapper = mount(WheelView)
    const alert = wrapper.get('[data-testid="wheel-persist-error"]')
    expect(alert.attributes('role')).toBe('alert')
    expect(alert.text()).toContain('Không thể lưu')
  })

  it('shows result panel when phase is result', async () => {
    const mod = await import('./composables/useWheelGame')
    const controls = mod as typeof mod & {
      __testControls: {
        phase: { value: 'idle' | 'spinning' | 'result' }
        winnerLabel: { value: string | null }
      }
    }
    controls.__testControls.phase.value = 'result'
    controls.__testControls.winnerLabel.value = 'Uống 50%'

    const wrapper = mount(WheelView)
    expect(wrapper.get('[data-testid="wheel-result"]').text()).toContain('Uống 50%')
  })

  it('locks editor controls while spinning', async () => {
    const mod = await import('./composables/useWheelGame')
    const controls = mod as typeof mod & {
      __testControls: { isSpinning: { value: boolean } }
    }
    controls.__testControls.isSpinning.value = true

    const wrapper = mount(WheelView)
    expect((wrapper.get('[data-testid="wheel-editor-add"]').element as HTMLButtonElement).disabled).toBe(
      true,
    )
  })

  it('primes audio on first spin click', async () => {
    const mod = await import('./composables/useWheelGame')
    const controls = mod as typeof mod & {
      __testControls: { spin: ReturnType<typeof vi.fn> }
    }

    const wrapper = mount(WheelView)
    await wrapper.get('[data-testid="wheel-spin-button"]').trigger('click')

    expect(controls.__testControls.spin).toHaveBeenCalled()
  })
})
