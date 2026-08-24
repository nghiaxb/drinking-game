<template>
  <dialog
    ref="dialogRef"
    class="confirm-dialog fixed inset-0 z-50 m-auto w-[min(100%-2rem,24rem)] rounded-2xl border-2 border-border bg-surface-elevated p-0 shadow-tactile backdrop:bg-ink/40"
    :open="open"
    :data-testid="testId"
    :aria-labelledby="titleId"
    :aria-describedby="messageId"
    @cancel.prevent="emit('cancel')"
  >
    <form method="dialog" class="flex flex-col gap-4 p-5" @submit.prevent="emit('confirm')">
      <div>
        <h2 :id="titleId" class="text-lg font-semibold text-ink">{{ title }}</h2>
        <p :id="messageId" class="mt-2 text-sm text-ink-muted">{{ message }}</p>
      </div>
      <div class="flex flex-wrap justify-end gap-2">
        <button type="button" class="btn-tactile min-w-[5.5rem]" data-testid="confirm-cancel" @click="emit('cancel')">
          {{ cancelLabel }}
        </button>
        <button type="submit" class="btn-tactile btn-tactile-primary min-w-[5.5rem]" data-testid="confirm-accept">
          {{ confirmLabel }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    testId?: string
  }>(),
  {
    confirmLabel: 'Xác nhận',
    cancelLabel: 'Huỷ',
    testId: 'confirm-dialog',
  },
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const dialogRef = ref<HTMLDialogElement | null>(null)
const titleId = computed(() => `${props.testId}-title`)
const messageId = computed(() => `${props.testId}-message`)

watch(
  () => props.open,
  (isOpen) => {
    const dialog = dialogRef.value
    if (!dialog) {
      return
    }
    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal()
      } else {
        dialog.setAttribute('open', 'true')
      }
    }
    if (!isOpen && dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close()
      } else {
        dialog.removeAttribute('open')
      }
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.confirm-dialog::backdrop {
  background: color-mix(in srgb, var(--color-ink) 45%, transparent);
}
</style>
