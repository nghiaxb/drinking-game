<script setup lang="ts">
import { computed } from 'vue'
import {
  IconCheck,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconX,
} from '@tabler/icons-vue'
import { WHEEL_CONFIG } from '../config'
import type { EditorDraft, EditorValidationResult, WheelItem } from '../types'

const props = defineProps<{
  items: readonly WheelItem[]
  editorOpen: boolean
  editorDraft: EditorDraft
  editingId: string | null
  editorValidation: EditorValidationResult
  persistError: string | null
  locked: boolean
}>()

const emit = defineEmits<{
  openEditor: []
  closeEditor: []
  setDraft: [draft: Partial<EditorDraft>]
  saveDraft: []
  startEdit: [item: WheelItem]
  toggleEnabled: [id: string]
  deleteItem: [id: string]
  resetItems: []
}>()

const draftErrors = computed(() => props.editorValidation.errors.map((error) => error.message))
const maxLabelLength = WHEEL_CONFIG.maxLabelLength
</script>

<template>
  <section
    class="wheel-editor w-full max-w-md overflow-x-hidden"
    data-testid="wheel-editor"
    aria-labelledby="wheel-editor-heading"
  >
    <p
      v-if="persistError"
      class="mb-3 rounded-xl border border-accent bg-accent-soft px-3 py-2 text-sm text-ink"
      data-testid="wheel-persist-error"
      role="alert"
    >
      {{ persistError }}
    </p>

    <div class="mb-3 flex items-center justify-between gap-2">
      <h2 id="wheel-editor-heading" class="font-display text-lg font-semibold text-ink">
        Danh sách
      </h2>
      <div class="flex gap-2">
        <button
          type="button"
          class="btn-tactile min-h-11 min-w-11 px-3"
          data-testid="wheel-editor-add"
          :disabled="locked"
          aria-label="Thêm mục mới"
          @click="emit('openEditor')"
        >
          <IconPlus :size="20" stroke="2" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="btn-tactile min-h-11 min-w-11 px-3"
          data-testid="wheel-editor-reset"
          :disabled="locked"
          aria-label="Đặt lại danh sách mặc định"
          @click="emit('resetItems')"
        >
          <IconRefresh :size="20" stroke="2" aria-hidden="true" />
        </button>
      </div>
    </div>

    <ul class="m-0 flex list-none flex-col gap-2 p-0">
      <li
        v-for="item in items"
        :key="item.id"
        class="wheel-editor-row flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-3 py-2"
        :data-testid="`wheel-item-row-${item.id}`"
      >
        <label class="flex min-h-11 min-w-0 flex-1 items-center gap-2">
          <input
            type="checkbox"
            class="h-5 w-5 shrink-0 accent-accent"
            :checked="item.enabled"
            :disabled="locked"
            :data-testid="`wheel-item-toggle-${item.id}`"
            :aria-label="`${item.enabled ? 'Tắt' : 'Bật'} ${item.label}`"
            @change="emit('toggleEnabled', item.id)"
          />
          <span
            class="line-clamp-2 min-w-0 break-words text-sm font-medium"
            :class="item.enabled ? 'text-ink' : 'text-ink-muted line-through'"
          >
            {{ item.label }}
          </span>
        </label>

        <button
          type="button"
          class="btn-tactile min-h-11 min-w-11 shrink-0 px-2"
          :data-testid="`wheel-item-edit-${item.id}`"
          :disabled="locked"
          :aria-label="`Sửa ${item.label}`"
          @click="emit('startEdit', item)"
        >
          <IconEdit :size="18" stroke="2" aria-hidden="true" />
        </button>

        <button
          type="button"
          class="btn-tactile min-h-11 min-w-11 shrink-0 px-2"
          :data-testid="`wheel-item-delete-${item.id}`"
          :disabled="locked"
          :aria-label="`Xóa ${item.label}`"
          @click="emit('deleteItem', item.id)"
        >
          <IconTrash :size="18" stroke="2" aria-hidden="true" />
        </button>
      </li>
    </ul>

    <form
      v-if="editorOpen"
      class="wheel-editor-form mt-4 rounded-2xl border border-border bg-surface-elevated p-4"
      data-testid="wheel-editor-form"
      @submit.prevent="emit('saveDraft')"
    >
      <div class="mb-3 flex items-center justify-between">
        <h3 class="font-display text-base font-semibold text-ink">
          {{ editingId ? 'Sửa mục' : 'Thêm mục' }}
        </h3>
        <button
          type="button"
          class="btn-tactile min-h-11 min-w-11 px-2"
          data-testid="wheel-editor-close"
          aria-label="Đóng trình chỉnh sửa"
          @click="emit('closeEditor')"
        >
          <IconX :size="18" stroke="2" aria-hidden="true" />
        </button>
      </div>

      <label class="mb-3 block text-sm font-medium text-ink">
        Nhãn
        <input
          :value="editorDraft.label"
          type="text"
          class="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-base"
          data-testid="wheel-editor-label"
          :disabled="locked"
          :maxlength="maxLabelLength"
          required
          @input="emit('setDraft', { label: ($event.target as HTMLInputElement).value })"
        />
      </label>

      <label class="mb-3 flex min-h-11 items-center gap-2 text-sm font-medium text-ink">
        <input
          :checked="editorDraft.enabled"
          type="checkbox"
          class="h-5 w-5 accent-accent"
          data-testid="wheel-editor-enabled"
          :disabled="locked"
          @change="emit('setDraft', { enabled: ($event.target as HTMLInputElement).checked })"
        />
        Bật trên vòng quay
      </label>

      <p
        v-if="draftErrors.length > 0"
        class="mb-3 text-sm text-accent"
        data-testid="wheel-editor-errors"
        role="alert"
      >
        {{ draftErrors.join(' ') }}
      </p>

      <button
        type="submit"
        class="btn-tactile btn-tactile-primary min-h-11 w-full"
        data-testid="wheel-editor-save"
        :disabled="locked || !editorValidation.valid"
      >
        <IconCheck :size="20" stroke="2" aria-hidden="true" />
        Lưu
      </button>
    </form>
  </section>
</template>
