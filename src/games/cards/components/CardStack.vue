<template>
  <div class="card-stack-root w-full select-none">
    <button
      ref="stackButton"
      type="button"
      class="card-stack-button relative mx-auto block min-h-11 w-full touch-manipulation border-0 bg-transparent p-0"
      data-testid="card-stack-button"
      :aria-label="buttonLabel"
      :disabled="locked"
      :style="{ touchAction: 'pan-y' }"
      @click="onClick"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <div
        class="card-stack-scene aspect-[3/4] w-full"
        data-testid="card-stack-scene"
        :style="sceneStyle"
      >
        <div
          class="card-stack-inner"
          data-testid="card-stack-inner"
          :style="innerStyle"
        >
          <div
            class="card-face card-face-back"
            data-testid="card-face-back"
            aria-hidden="true"
          >
            <span class="card-back-mark">?</span>
            <span class="card-back-hint">{{ hintText }}</span>
          </div>

          <div
            class="card-face card-face-front"
            data-testid="card-face-front"
            :class="frontToneClass"
            :aria-hidden="showFront ? 'false' : 'true'"
          >
            <p class="card-front-label">{{ frontLabel }}</p>
            <p class="card-front-text">{{ card?.text ?? '' }}</p>
          </div>
        </div>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { CARDS_CONFIG } from '../config'
import { buildCardFrontLabel, resolveCardToneClass } from '../presentation'
import type { Card } from '../types'

const props = withDefaults(
  defineProps<{
    card: Card | null
    isFlipped: boolean
    locked?: boolean
    flipDurationMs?: number
    hintText?: string
  }>(),
  {
    locked: false,
    flipDurationMs: CARDS_CONFIG.flipDurationMs,
    hintText: 'Chạm hoặc vuốt ngang',
  },
)

const emit = defineEmits<{
  draw: []
}>()

const stackButton = ref<HTMLButtonElement | null>(null)

function capturePointer(element: HTMLButtonElement | null, pointerId: number): void {
  try {
    if (element && typeof element.setPointerCapture === 'function') {
      element.setPointerCapture(pointerId)
    }
  } catch {
    // Pointer capture unavailable — safe no-op.
  }
}

function releasePointer(element: HTMLButtonElement | null, pointerId: number): void {
  try {
    if (
      element &&
      typeof element.hasPointerCapture === 'function' &&
      typeof element.releasePointerCapture === 'function' &&
      element.hasPointerCapture(pointerId)
    ) {
      element.releasePointerCapture(pointerId)
    }
  } catch {
    // Pointer release unavailable — safe no-op.
  }
}

const dragOffsetX = ref(0)
const dragging = ref(false)
const suppressClick = ref(false)
const activePointerId = ref<number | null>(null)
const pointerStartX = ref(0)

const showFront = computed(() => props.isFlipped)
const frontLabel = computed(() => buildCardFrontLabel(props.card))
const frontToneClass = computed(() => resolveCardToneClass(props.card))
const buttonLabel = computed(() =>
  props.isFlipped && props.card
    ? `${frontLabel.value}: ${props.card.text}`
    : 'Bốc bài — chạm hoặc vuốt ngang để bốc lá',
)

const innerStyle = computed(() => {
  const rotateY = props.isFlipped ? 180 : 0
  const dragRotate = dragging.value ? dragOffsetX.value * 0.08 : 0
  const duration = props.flipDurationMs <= 0 ? '0ms' : `${props.flipDurationMs}ms`
  const transition =
    props.flipDurationMs <= 0 || dragging.value ? 'none' : `transform ${duration} ease`

  return {
    transform: `rotateY(${rotateY + dragRotate}deg) translateX(${dragOffsetX.value}px)`,
    transition,
  }
})

const sceneStyle = computed(() => ({
  perspective: '1000px',
}))

function resetPointerState(): void {
  dragging.value = false
  dragOffsetX.value = 0
  activePointerId.value = null
}

function emitDraw(): void {
  if (props.locked) {
    return
  }
  emit('draw')
}

function onClick(event: MouseEvent): void {
  if (suppressClick.value) {
    suppressClick.value = false
    event.preventDefault()
    return
  }
  emitDraw()
}

function onPointerDown(event: PointerEvent): void {
  if (props.locked || event.button !== 0) {
    return
  }

  activePointerId.value = event.pointerId
  pointerStartX.value = event.clientX
  dragging.value = true
  suppressClick.value = false
  capturePointer(stackButton.value, event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging.value || activePointerId.value !== event.pointerId) {
    return
  }

  dragOffsetX.value = event.clientX - pointerStartX.value
}

function onPointerUp(event: PointerEvent): void {
  if (activePointerId.value !== event.pointerId) {
    return
  }

  const deltaX = event.clientX - pointerStartX.value
  const absDelta = Math.abs(deltaX)

  releasePointer(stackButton.value, event.pointerId)

  if (absDelta >= CARDS_CONFIG.swipeThresholdPx) {
    suppressClick.value = true
    emitDraw()
  }

  resetPointerState()
}

function onPointerCancel(event: PointerEvent): void {
  if (activePointerId.value !== event.pointerId) {
    return
  }

  releasePointer(stackButton.value, event.pointerId)
  resetPointerState()
}
</script>

<style scoped>
.card-stack-root {
  width: 100%;
  max-width: min(100%, 18rem);
}

@media (max-height: 800px) {
  .card-stack-root {
    max-width: min(100%, 14rem);
  }
}

@media (max-height: 680px) {
  .card-stack-root {
    max-width: min(100%, 12rem);
  }
}

.card-stack-scene {
  perspective: 1000px;
}

.card-stack-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

.card-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.75rem;
  border-radius: 1rem;
  border: 2px solid color-mix(in srgb, var(--color-ink) 12%, transparent);
  padding: 1rem;
  backface-visibility: hidden;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--color-ink) 12%, transparent);
}

.card-face-back {
  align-items: center;
  background: linear-gradient(145deg, #2f3542, #1f2430);
  color: #fff;
}

.card-back-mark {
  font-family: var(--font-display);
  font-size: 3rem;
  font-weight: 700;
  line-height: 1;
}

.card-back-hint {
  font-size: 0.75rem;
  opacity: 0.85;
  text-align: center;
}

.card-face-front {
  transform: rotateY(180deg);
  background: var(--color-surface);
  color: var(--color-ink);
}

.card-front-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.card-front-text {
  font-size: 1rem;
  line-height: 1.45;
  text-wrap: pretty;
}

.cards-tone-idle {
  background: var(--color-surface);
}

.cards-tone-truth-light {
  background: color-mix(in srgb, #7dd3fc 24%, var(--color-surface));
}

.cards-tone-truth-medium {
  background: color-mix(in srgb, #fbbf24 24%, var(--color-surface));
}

.cards-tone-truth-spicy {
  background: color-mix(in srgb, #fb7185 24%, var(--color-surface));
}

.cards-tone-dare {
  background: color-mix(in srgb, #a78bfa 24%, var(--color-surface));
}

.cards-tone-drink {
  background: color-mix(in srgb, #34d399 24%, var(--color-surface));
}

.cards-tone-choose {
  background: color-mix(in srgb, #60a5fa 24%, var(--color-surface));
}

.cards-tone-everyone {
  background: color-mix(in srgb, #f472b6 24%, var(--color-surface));
}

.cards-tone-lucky {
  background: color-mix(in srgb, #facc15 24%, var(--color-surface));
}

.cards-tone-skill {
  background: color-mix(in srgb, #fb923c 24%, var(--color-surface));
}

.cards-tone-rule {
  background: color-mix(in srgb, #94a3b8 24%, var(--color-surface));
}
</style>
