<template>
  <div
    class="slot-result w-full max-w-xs rounded-2xl border-2 px-4 py-4 text-center shadow-tactile"
    :class="resultClass"
    data-testid="slot-result"
    role="status"
    aria-live="assertive"
    :aria-label="resultAriaLabel"
  >
    <p class="font-display text-xl font-bold text-ink">{{ headline }}</p>
    <p
      v-if="rewardLabel"
      class="mt-2 text-lg font-semibold text-ink"
      data-testid="slot-result-detail"
    >
      {{ rewardLabel }}
    </p>
    <p
      v-if="symbolRow"
      class="mt-2 text-lg font-semibold text-ink"
      data-testid="slot-result-symbol-row"
    >
      {{ symbolRow }}
    </p>
    <button
      type="button"
      class="btn-tactile btn-tactile-primary mt-4 min-h-11 w-full"
      data-testid="slot-replay"
      @click="$emit('replay')"
    >
      <IconRefresh :size="20" stroke="2" aria-hidden="true" />
      Kéo lại
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IconRefresh } from '@tabler/icons-vue'
import { buildResultAnnouncement, resolveOutcomeLabel } from '../rewards'
import type { SpinOutcome } from '../types'

const props = withDefaults(
  defineProps<{
    rewardLabel: string
    outcome: SpinOutcome
    isJackpot: boolean
    symbolRow?: string
    reducedMotion?: boolean
  }>(),
  { symbolRow: '' },
)

defineEmits<{
  replay: []
}>()

const headline = computed(() => resolveOutcomeLabel(props.outcome, props.isJackpot))

const resultAriaLabel = computed(() =>
  buildResultAnnouncement(props.outcome, props.isJackpot, props.rewardLabel, props.symbolRow),
)

/** Three tiers get three weights of surface, so the payout size is readable before the text is. */
const resultClass = computed(() => {
  if (props.isJackpot) {
    return props.reducedMotion
      ? 'border-accent bg-accent-soft'
      : 'border-accent bg-accent-soft slot-result--jackpot'
  }
  if (props.outcome === 'pair') {
    return 'border-teal bg-teal-soft'
  }
  return 'border-ink/15 bg-surface'
})
</script>

<style scoped>
.slot-result--jackpot {
  animation: slot-jackpot-pop 480ms ease-out;
}

@keyframes slot-jackpot-pop {
  0% {
    transform: scale(0.96);
    opacity: 0.85;
  }
  60% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .slot-result--jackpot {
    animation: none;
  }
}
</style>
