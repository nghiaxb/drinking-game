import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { AppStorage } from '@/services/storage'
import { resolveSpinDurationMs, WHEEL_CONFIG, WHEEL_STORAGE_KEY_ITEMS } from '../config'
import {
  buildItemFromDraft,
  computeSpinPlan,
  createInitialState,
  getSpinBlockReason,
  parsePersistedItems,
  resetItemsToDefaults,
  sanitizeItems,
  tryAddItem,
  tryDeleteItem,
  tryReplaceItem,
  tryToggleItemEnabled,
  validateEditorDraft,
  type RandomSource,
} from '../logic/wheelGame'
import type { EditorDraft, EditorValidationResult, SpinBlockReason, WheelItem, WheelPhase } from '../types'
import { useWheelAnimation } from './useWheelAnimation'

export interface WheelFeedback {
  playTick: () => Promise<void>
  playWin: () => Promise<void>
  vibrateHeavy: () => Promise<void>
}

export interface WheelGameOptions {
  storage: AppStorage
  rng?: RandomSource
  feedback: WheelFeedback
  prefersReducedMotion: Ref<boolean>
  primeAudio?: () => void
}

export interface WheelGameController {
  loaded: Ref<boolean>
  items: Ref<WheelItem[]>
  phase: Ref<WheelPhase>
  rotation: Ref<number>
  winnerId: Ref<string | null>
  winnerLabel: Ref<string | null>
  pendingWinnerId: Ref<string | null>
  editorOpen: Ref<boolean>
  editorDraft: Ref<EditorDraft>
  editingId: Ref<string | null>
  editorValidation: ComputedRef<EditorValidationResult>
  persistError: Ref<string | null>
  spinDurationMs: ComputedRef<number>
  spinBlockReason: ComputedRef<SpinBlockReason | null>
  spinBlockMessage: ComputedRef<string | null>
  isSpinning: Ref<boolean>
  load: () => Promise<void>
  persistItems: () => Promise<boolean>
  spin: () => Promise<boolean>
  dismissResult: () => void
  openEditor: () => void
  closeEditor: () => void
  startEdit: (item: WheelItem) => void
  setEditorDraft: (draft: Partial<EditorDraft>) => void
  saveEditorDraft: () => Promise<boolean>
  toggleItemEnabled: (id: string) => Promise<boolean>
  deleteItem: (id: string) => Promise<boolean>
  resetItems: () => Promise<boolean>
  primeAudio: () => void
  dispose: () => void
}

function defaultRng(): number {
  return Math.random()
}

const SPIN_BLOCK_MESSAGES: Record<SpinBlockReason, string> = {
  'too-few-enabled': 'Cần ít nhất 2 mục bật để quay.',
  spinning: 'Đang quay, vui lòng đợi.',
  'editor-open': 'Đóng trình chỉnh sửa trước khi quay.',
  'editor-invalid': 'Sửa lỗi trong trình chỉnh sửa trước khi quay.',
}

const PERSIST_ERROR_MESSAGE = 'Không thể lưu dữ liệu. Vui lòng thử lại.'

export function createWheelGame(options: WheelGameOptions): WheelGameController {
  const rng = options.rng ?? defaultRng
  const state = ref(createInitialState())
  const loaded = ref(false)
  const pendingWinnerId = ref<string | null>(null)
  const editorOpen = ref(false)
  const editingId = ref<string | null>(null)
  const editorDraft = ref<EditorDraft>({ label: '', enabled: true })
  const persistError = ref<string | null>(null)
  let loadPromise: Promise<void> | null = null
  let spinInProgress = false

  const items = computed({
    get: () => state.value.items,
    set: (next) => {
      state.value = { ...state.value, items: next }
    },
  })

  const phase = computed(() => state.value.phase)
  const rotation = ref(state.value.currentRotation)
  const winnerId = computed(() => state.value.winnerId)
  const winnerLabel = computed(() => state.value.winnerLabel)

  const editorValidation = computed(() => validateEditorDraft(editorDraft.value))

  const spinBlockReason = computed(() =>
    getSpinBlockReason({
      phase: phase.value,
      items: items.value,
      editorOpen: editorOpen.value,
      editorInvalid: editorOpen.value && !editorValidation.value.valid,
    }),
  )

  const spinBlockMessage = computed(() => {
    const reason = spinBlockReason.value
    return reason ? SPIN_BLOCK_MESSAGES[reason] : null
  })

  const spinDurationMs = computed(() =>
    resolveSpinDurationMs(options.prefersReducedMotion.value),
  )

  const animation = useWheelAnimation({
    rotation,
    resolveDurationMs: () => spinDurationMs.value,
    tickIntervalMs: WHEEL_CONFIG.tickIntervalMs,
    playTick: () => options.feedback.playTick(),
    onComplete: () => {
      state.value = {
        ...state.value,
        phase: 'result',
        currentRotation: rotation.value,
        winnerId: pendingWinnerId.value,
        winnerLabel:
          items.value.find((item) => item.id === pendingWinnerId.value)?.label ?? null,
      }
      pendingWinnerId.value = null
      void Promise.resolve(options.feedback.playWin()).catch(() => {
        // Win sound failure — safe no-op.
      })
      void Promise.resolve(options.feedback.vibrateHeavy()).catch(() => {
        // Haptic failure — safe no-op.
      })
    },
  })

  async function persistItems(): Promise<boolean> {
    return options.storage.set(WHEEL_STORAGE_KEY_ITEMS, sanitizeItems(items.value))
  }

  async function mutateItems(nextItems: WheelItem[]): Promise<boolean> {
    const snapshot = items.value.map((item) => ({ ...item }))
    items.value = nextItems

    const saved = await persistItems()
    if (!saved) {
      items.value = snapshot
      persistError.value = PERSIST_ERROR_MESSAGE
      return false
    }

    persistError.value = null
    return true
  }

  async function load(): Promise<void> {
    if (loaded.value) {
      return
    }
    if (loadPromise) {
      return loadPromise
    }

    loadPromise = (async () => {
      const stored = await options.storage.get<unknown>(WHEEL_STORAGE_KEY_ITEMS, null)
      const parsed = parsePersistedItems(stored)
      state.value = createInitialState(parsed)
      rotation.value = state.value.currentRotation
      loaded.value = true
    })()

    return loadPromise
  }

  async function spin(): Promise<boolean> {
    const blockReason = spinBlockReason.value
    if (blockReason) {
      return false
    }

    if (spinInProgress) {
      return false
    }

    spinInProgress = true
    options.primeAudio?.()

    const plan = computeSpinPlan(rng, items.value, state.value.currentRotation)
    pendingWinnerId.value = plan.winnerId
    state.value = {
      ...state.value,
      phase: 'spinning',
      winnerId: null,
      winnerLabel: null,
    }

    const completed = await animation.startSpin({ targetRotation: plan.targetRotation })
    if (!completed) {
      pendingWinnerId.value = null
      state.value = { ...state.value, phase: 'idle' }
      spinInProgress = false
      return false
    }

    spinInProgress = false
    return true
  }

  function dismissResult(): void {
    state.value = {
      ...state.value,
      phase: 'idle',
      winnerId: null,
      winnerLabel: null,
    }
  }

  function openEditor(): void {
    editorOpen.value = true
    editingId.value = null
    editorDraft.value = { label: '', enabled: true }
  }

  function startEdit(item: WheelItem): void {
    editorOpen.value = true
    editingId.value = item.id
    editorDraft.value = { label: item.label, enabled: item.enabled }
  }

  function closeEditor(): void {
    editorOpen.value = false
    editingId.value = null
  }

  function setEditorDraft(draft: Partial<EditorDraft>): void {
    editorDraft.value = { ...editorDraft.value, ...draft }
  }

  async function saveEditorDraft(): Promise<boolean> {
    if (!editorValidation.value.valid) {
      return false
    }

    const nextItem = buildItemFromDraft(editorDraft.value, items.value, editingId.value)
    if (!nextItem) {
      return false
    }

    const nextItems = editingId.value
      ? tryReplaceItem(items.value, editingId.value, nextItem)
      : tryAddItem(items.value, nextItem)

    if (!nextItems) {
      return false
    }

    const saved = await mutateItems(nextItems)
    if (!saved) {
      return false
    }

    closeEditor()
    return true
  }

  async function toggleEnabled(id: string): Promise<boolean> {
    const nextItems = tryToggleItemEnabled(items.value, id)
    if (!nextItems) {
      return false
    }
    return mutateItems(nextItems)
  }

  async function removeItem(id: string): Promise<boolean> {
    const nextItems = tryDeleteItem(items.value, id)
    if (!nextItems) {
      return false
    }
    return mutateItems(nextItems)
  }

  async function resetItems(): Promise<boolean> {
    return mutateItems(resetItemsToDefaults())
  }

  function primeAudio(): void {
    options.primeAudio?.()
  }

  function dispose(): void {
    animation.dispose()
    if (phase.value === 'spinning') {
      pendingWinnerId.value = null
      state.value = { ...state.value, phase: 'idle' }
      spinInProgress = false
    }
  }

  return {
    loaded,
    items,
    phase,
    rotation,
    winnerId,
    winnerLabel,
    pendingWinnerId,
    editorOpen,
    editorDraft,
    editingId,
    editorValidation,
    persistError,
    spinDurationMs,
    spinBlockReason,
    spinBlockMessage,
    isSpinning: animation.isSpinning,
    load,
    persistItems,
    spin,
    dismissResult,
    openEditor,
    closeEditor,
    startEdit,
    setEditorDraft,
    saveEditorDraft,
    toggleItemEnabled: toggleEnabled,
    deleteItem: removeItem,
    resetItems,
    primeAudio,
    dispose,
  }
}

export function useWheelGame(options: WheelGameOptions): WheelGameController {
  return createWheelGame(options)
}

export type { EditorDraft }
