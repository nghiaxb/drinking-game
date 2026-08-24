<template>
  <div
    class="slot-reels mx-auto grid w-full max-w-[min(100%,18rem)] grid-cols-3 gap-2"
    data-testid="slot-reels"
    role="group"
    aria-label="Ba guồng kéo cần"
  >
    <div
      v-for="(symbolId, index) in displaySymbols"
      :key="index"
      class="slot-reel flex aspect-[3/4] min-h-[5.5rem] items-center justify-center overflow-hidden rounded-2xl border-2 border-ink/15 bg-surface shadow-tactile"
      :class="{
        'slot-reel--stopped': stoppedReels[index],
        'slot-reel--jackpot': jackpotActive && stoppedReels[index],
      }"
      :data-testid="`slot-reel-${index}`"
      :data-reel-status="reelStatuses[index]"
      :aria-label="reelLabels[index]"
    >
      <span
        class="slot-reel-symbol select-none font-display text-5xl leading-none"
        :class="symbolMotionClass(index)"
        aria-hidden="true"
      >
        {{ getSymbolEmoji(symbolId) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { buildReelAriaLabel, resolveReelVisualStatus } from '../logic/slotGame'
import { getSymbolEmoji } from '../symbols'
import type { SlotPhase, SlotSymbolId } from '../types'

const props = defineProps<{
  displaySymbols: [SlotSymbolId, SlotSymbolId, SlotSymbolId]
  stoppedReels: [boolean, boolean, boolean]
  spinning: boolean
  gamePhase: SlotPhase
  jackpotActive?: boolean
  reducedMotion?: boolean
}>()

const reelStatuses = computed(() =>
  props.displaySymbols.map((_symbolId, index) =>
    resolveReelVisualStatus(props.gamePhase, props.spinning, props.stoppedReels[index]),
  ),
)

const reelLabels = computed(() =>
  props.displaySymbols.map((symbolId, index) =>
    buildReelAriaLabel(index, getSymbolEmoji(symbolId), reelStatuses.value[index]),
  ),
)

function symbolMotionClass(index: number): Record<string, boolean> {
  const spinningReel = props.spinning && !props.stoppedReels[index]
  const stoppedDuringSpin = props.spinning && props.stoppedReels[index]

  return {
    'slot-reel-symbol--cycle': spinningReel && !props.reducedMotion,
    'slot-reel-symbol--shake': stoppedDuringSpin && !props.reducedMotion,
  }
}
</script>

<style scoped>
.slot-reel--stopped {
  border-color: color-mix(in srgb, var(--color-teal) 55%, transparent);
}

.slot-reel--jackpot {
  border-color: var(--color-accent);
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--color-accent) 35%, transparent),
    var(--shadow-tactile);
}

.slot-reel-symbol--cycle {
  animation: slot-reel-cycle 80ms linear infinite;
}

.slot-reel-symbol--shake {
  animation: slot-reel-stop 220ms ease-out;
}

@keyframes slot-reel-cycle {
  0% {
    transform: translateY(-22%);
    opacity: 0.45;
    filter: blur(1.5px);
  }
  50% {
    transform: translateY(0);
    opacity: 1;
    filter: blur(0);
  }
  100% {
    transform: translateY(22%);
    opacity: 0.45;
    filter: blur(1.5px);
  }
}

@keyframes slot-reel-stop {
  0% {
    transform: translateY(-2px) scale(1.04);
  }
  45% {
    transform: translateY(1px) scale(0.98);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .slot-reel-symbol--cycle,
  .slot-reel-symbol--shake {
    animation: none;
  }
}
</style>
