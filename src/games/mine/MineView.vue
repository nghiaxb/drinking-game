<template>
  <section
    class="game-surface mine-view--scroll-y flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden py-1"
    data-testid="mine-view"
    aria-labelledby="mine-heading"
  >
    <header class="shrink-0 text-center">
      <h1 id="mine-heading" class="font-display text-2xl font-semibold text-ink">Bắt ếch</h1>
      <p class="mt-0.5 text-sm text-ink-muted">Bắt hết ếch đi — gặp ếch khóc thì uống.</p>
    </header>

    <div class="flex flex-1 flex-col items-center justify-center gap-3 px-1">
      <div
        class="flex flex-wrap justify-center gap-2"
        role="group"
        aria-label="Số ếch phạt trong lưới"
        data-testid="mine-count-selector"
      >
        <button
          v-for="option in mineCountOptions"
          :key="option"
          type="button"
          class="mine-chip min-h-11"
          :class="{ 'mine-chip--on': game.mineCount.value === option }"
          :data-testid="`mine-count-${option}`"
          :aria-pressed="game.mineCount.value === option ? 'true' : 'false'"
          :aria-label="`${option} ếch phạt`"
          @click="game.setMineCount(option)"
        >
          {{ option }}
          <FrogIcon class="mine-chip__frog" variant="crying" />
        </button>
      </div>

      <div class="mine-readout w-full max-w-[min(100%,22rem)]" data-testid="mine-readout">
        <div class="flex items-baseline justify-between text-xs font-semibold text-ink-muted">
          <span>Đã bắt {{ game.safeRevealedCount.value }}/{{ game.safeTotalCount.value }} ếch</span>
          <span data-testid="mine-risk-label">{{ riskLabel }}</span>
        </div>
        <div class="mine-risk" aria-hidden="true">
          <span class="mine-risk-fill" :class="riskClass" :style="riskStyle"></span>
        </div>
      </div>

      <div
        class="mine-stage w-full max-w-[min(100%,22rem)]"
        data-testid="mine-stage"
        role="region"
        :aria-label="statusText"
      >
        <MineGrid
          :grid-size="game.gridSize.value"
          :revealed-indices="game.revealedIndices.value"
          :disabled-indices="disabledIndices"
          :mine-indices="game.mineIndices.value"
          :hit-mine-index="game.hitMineIndex.value"
          :exploded="game.isTerminal.value"
          @press="onPressCell"
        />

        <!-- Overlaid on the board so the revealed mine stays visible and nothing below shifts. -->
        <div
          v-if="game.isTerminal.value"
          class="mine-result-layer"
          :class="{ 'mine-result-layer--top': resultAtTop }"
        >
          <div class="mine-result" data-testid="mine-result" role="alert">
            <p class="mine-result-title">
              <FrogIcon class="mine-result-frog" variant="crying" />
              ẾCH KHÓC!
              <span class="mine-result-drink">UỐNG!</span>
            </p>
            <button
              type="button"
              class="btn-tactile btn-tactile-primary mt-2 min-h-11 w-full"
              data-testid="mine-replay"
              @click="onReplay"
            >
              <IconRefresh :size="20" stroke="2" aria-hidden="true" />
              Chơi lại
            </button>
          </div>
        </div>
      </div>

      <p class="sr-only" aria-live="polite" data-testid="mine-status-live">
        {{ statusText }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { IconRefresh } from '@tabler/icons-vue'
import { useGameFeedback } from '@/composables/useGameFeedback'
import FrogIcon from './components/FrogIcon.vue'
import MineGrid from './components/MineGrid.vue'
import { MINE_CONFIG } from './config'
import { useMineGame } from './composables/useMineGame'

const feedback = useGameFeedback()
const audioPrimed = ref(false)

const game = useMineGame({
  feedback: {
    playClick: () => feedback.playClick(),
    playExplosion: () => feedback.playExplosion(),
    vibrateLight: () => feedback.vibrateLight(),
    vibrateHeavy: () => feedback.vibrateHeavy(),
  },
  primeAudio: () => feedback.primeAudio(),
})

const mineCountOptions = Array.from(
  { length: MINE_CONFIG.maxMineCount - MINE_CONFIG.minMineCount + 1 },
  (_, offset) => MINE_CONFIG.minMineCount + offset,
)

const disabledIndices = computed(() => {
  const indices: number[] = []
  const total = game.gridSize.value * game.gridSize.value
  for (let index = 0; index < total; index += 1) {
    if (game.isCellDisabled(index)) {
      indices.push(index)
    }
  }
  return indices
})

const riskPercent = computed(() => Math.round(game.nextRisk.value * 100))

/*
 * Once the round is over the risk is 0 by definition, which would read as "safe now". Show the
 * outcome instead, and fill the bar so it matches the result panel.
 */
const riskLabel = computed(() =>
  game.isTerminal.value ? 'Hết lượt' : `Rủi ro lượt tới ${riskPercent.value}%`,
)

const riskStyle = computed(() => ({
  transform: `scaleX(${game.isTerminal.value ? 1 : game.nextRisk.value})`,
}))

/*
 * The panel overlays the board, so it must never cover the mine that just went off. It is kept
 * under two rows tall, so parking it in the far band from the mine's row always clears it.
 */
const resultAtTop = computed(() => {
  const hit = game.hitMineIndex.value
  if (hit === null) {
    return false
  }
  return Math.floor(hit / game.gridSize.value) >= 2
})

/** Three bands rather than a gradient, so the colour reads as a warning level at a glance. */
const riskClass = computed(() => {
  if (game.isTerminal.value || game.nextRisk.value >= 0.34) {
    return 'mine-risk-fill--high'
  }
  return game.nextRisk.value >= 0.15 ? 'mine-risk-fill--mid' : 'mine-risk-fill--low'
})

const statusText = computed(() => {
  if (game.isTerminal.value) {
    return 'Trúng ếch khóc! Uống một ly.'
  }
  if (game.revealedIndices.value.length === 0) {
    return `Bắt một con ếch để bắt đầu. Rủi ro lượt tới ${riskPercent.value}%.`
  }
  return `Đã bắt ${game.safeRevealedCount.value} con an toàn. Rủi ro lượt tới ${riskPercent.value}%.`
})

async function onPressCell(index: number): Promise<void> {
  if (!audioPrimed.value) {
    game.primeAudio()
    audioPrimed.value = true
  }
  await game.pressCell(index)
}

function onReplay(): void {
  game.reset()
}
</script>

<style scoped>
.mine-view--scroll-y {
  overflow-y: auto;
}

.mine-chip__frog {
  width: 1.25rem;
  height: 1.25rem;
}

.mine-result-frog {
  width: 1.5rem;
  height: 1.5rem;
}

.mine-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.85rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface-elevated);
  color: var(--color-ink-muted);
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;
}

.mine-chip:hover:not(.mine-chip--on) {
  border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
}

.mine-chip--on {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  color: color-mix(in srgb, var(--color-accent) 72%, var(--color-ink));
}

.mine-risk {
  overflow: hidden;
  height: 0.375rem;
  margin-top: 0.3rem;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
}

.mine-risk-fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-pill);
  transform-origin: left center;
  transition:
    transform 0.28s ease,
    background-color 0.28s ease;
}

.mine-risk-fill--low {
  background: var(--color-teal);
}

.mine-risk-fill--mid {
  background: var(--color-amber);
}

.mine-risk-fill--high {
  background: var(--color-accent);
}

.mine-stage {
  position: relative;
}

.mine-result-layer {
  position: absolute;
  right: 0;
  bottom: 0.5rem;
  left: 0;
  z-index: 30;
  display: flex;
  justify-content: center;
  padding-inline: 0.75rem;
  pointer-events: none;
}

.mine-result-layer--top {
  top: 0.5rem;
  bottom: auto;
}

.mine-result {
  width: 100%;
  max-width: 18rem;
  padding: 0.7rem 0.85rem 0.8rem;
  border: 2px solid var(--color-accent);
  border-radius: 1.25rem;
  background: color-mix(in srgb, var(--color-accent-soft) 94%, transparent);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--color-ink) 22%, transparent);
  text-align: center;
  pointer-events: auto;
  backdrop-filter: blur(2px);
}

.mine-result-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.3rem 0.5rem;
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-ink);
}

.mine-result-drink {
  font-size: 1rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--color-accent) 78%, var(--color-ink));
}

@media (prefers-reduced-motion: reduce) {
  .mine-risk-fill {
    transition: none;
  }
}
</style>
