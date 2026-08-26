<template>
  <div class="card-stack-root select-none">
    <button
      ref="stackButton"
      type="button"
      class="card-stack-button relative mx-auto block h-full min-h-11 w-full touch-manipulation border-0 bg-transparent p-0"
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
        class="card-stack-scene h-full w-full"
        data-testid="card-stack-scene"
        :style="sceneStyle"
      >
        <span class="card-stack-layer card-stack-layer--far" aria-hidden="true"></span>
        <span class="card-stack-layer card-stack-layer--near" aria-hidden="true"></span>

        <div class="card-stack-inner" data-testid="card-stack-inner" :style="innerStyle">
          <div class="card-face card-face-back" data-testid="card-face-back" aria-hidden="true">
            <span class="card-back-mark">?</span>
            <span class="card-back-hint">{{ hintText }}</span>
          </div>

          <div
            class="card-face card-face-front"
            data-testid="card-face-front"
            :class="frontToneClass"
            :aria-hidden="showFront ? 'false' : 'true'"
          >
            <svg class="card-pip card-pip--watermark" viewBox="0 0 24 24" aria-hidden="true">
              <path :d="pipPath" />
            </svg>
            <svg class="card-pip card-pip--corner-start" viewBox="0 0 24 24" aria-hidden="true">
              <path :d="pipPath" />
            </svg>
            <svg class="card-pip card-pip--corner-end" viewBox="0 0 24 24" aria-hidden="true">
              <path :d="pipPath" />
            </svg>

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
import { buildCardFrontLabel, resolveCardPipPath, resolveCardToneClass } from '../presentation'
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
const pipPath = computed(() => resolveCardPipPath(props.card))
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
/*
 * Sized by height, not width, so the card shrinks to fit its slot. max-height pairs with the 3:4
 * ratio to cap the width at 18rem, so max-width never has to fight the ratio.
 */
.card-stack-root {
  position: absolute;
  inset: 0;
  /* The card's furniture scales off the card, not the viewport: its size comes from spare height. */
  container: card / inline-size;
  height: 100%;
  max-height: 24rem;
  aspect-ratio: 3 / 4;
  margin: auto;
}

.card-stack-scene {
  position: relative;
  perspective: 1000px;
}

/* The two cards still in the deck, so the stack reads as a stack rather than a single panel. */
.card-stack-layer {
  position: absolute;
  inset: 0;
  border: 2px solid #12292a;
  border-radius: 1.15rem;
  background: #1c433e;
  box-shadow: 0 6px 14px color-mix(in srgb, var(--color-ink) 14%, transparent);
}

.card-stack-layer--near {
  transform: translate(4px, 5px) rotate(1.6deg);
}

.card-stack-layer--far {
  transform: translate(8px, 10px) rotate(3.2deg);
  opacity: 0.75;
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
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  overflow: hidden;
  border: 2px solid color-mix(in srgb, var(--color-ink) 12%, transparent);
  border-radius: 1.15rem;
  padding: 1.15rem 1rem;
  backface-visibility: hidden;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--color-ink) 14%, transparent);
}

.card-face-back {
  gap: 1rem;
  border-color: #12292a;
  /* Lattice over a deep teal, so the back is a printed card back and not a dark placeholder. */
  background:
    repeating-linear-gradient(45deg, transparent 0 7px, rgb(254 246 232 / 5%) 7px 14px),
    repeating-linear-gradient(-45deg, transparent 0 7px, rgb(254 246 232 / 5%) 7px 14px),
    linear-gradient(150deg, #275b56, #16332f);
  color: #fef6e8;
}

.card-face-back::after,
.card-face-front::after {
  content: '';
  position: absolute;
  inset: 0.5rem;
  border-radius: 0.85rem;
  pointer-events: none;
}

.card-face-back::after {
  border: 2px solid rgb(254 246 232 / 22%);
}

.card-back-mark {
  display: grid;
  place-items: center;
  width: clamp(3rem, 25cqw, 4.5rem);
  aspect-ratio: 1;
  border: 2px solid rgb(254 246 232 / 32%);
  border-radius: var(--radius-pill);
  background: rgb(254 246 232 / 8%);
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 12cqw, 2.25rem);
  font-weight: 700;
  line-height: 1;
}

.card-back-hint {
  font-size: 0.75rem;
  opacity: 0.8;
  text-align: center;
}

.card-face-front {
  transform: rotateY(180deg);
  border-color: color-mix(in srgb, var(--tone-edge) 38%, transparent);
  background: var(--tone-tint);
  color: var(--color-ink);
}

.card-face-front::after {
  border: 1px solid color-mix(in srgb, var(--tone-edge) 26%, transparent);
}

.card-pip {
  position: absolute;
  color: var(--tone-edge);
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

/* Cropped bottom-left: centred it fights the text, bottom-right it collides with the corner pip. */
.card-pip--watermark {
  bottom: -5%;
  left: -9%;
  width: 58%;
  opacity: 0.1;
  stroke-width: 1.2;
}

.card-pip--corner-start,
.card-pip--corner-end {
  width: clamp(0.85rem, 6cqw, 1.15rem);
}

/* On a short screen the card is too narrow to seat both the badge and the corner indices. */
@container card (max-width: 15rem) {
  .card-pip--corner-start,
  .card-pip--corner-end {
    display: none;
  }
}

.card-pip--corner-start {
  top: 1rem;
  left: 1rem;
}

.card-pip--corner-end {
  right: 1rem;
  bottom: 1rem;
  transform: rotate(180deg);
}

.card-front-label {
  position: absolute;
  top: 1rem;
  left: 50%;
  padding: 0.2rem clamp(0.4rem, 2.4cqw, 0.65rem);
  border-radius: var(--radius-pill);
  background: var(--tone-edge);
  color: #fff;
  font-size: clamp(0.5rem, 4.4cqw, 0.6875rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  transform: translateX(-50%);
}

.card-front-text {
  position: relative;
  max-width: 15rem;
  font-size: clamp(0.9375rem, 6.2cqw, 1.0625rem);
  font-weight: 600;
  line-height: 1.5;
  text-align: center;
  text-wrap: balance;
}

.cards-tone-idle {
  --tone-tint: var(--color-surface-elevated);
  --tone-edge: var(--color-ink-muted);
}

.cards-tone-truth-light {
  --tone-tint: #d9eefb;
  --tone-edge: #1b6485;
}

.cards-tone-truth-medium {
  --tone-tint: #ffeccc;
  --tone-edge: #8f4f0a;
}

.cards-tone-truth-spicy {
  --tone-tint: #ffdfe2;
  --tone-edge: #a82b41;
}

.cards-tone-dare {
  --tone-tint: #e9e2fb;
  --tone-edge: #553bb0;
}

.cards-tone-drink {
  --tone-tint: #d7f2e4;
  --tone-edge: #136b50;
}

.cards-tone-choose {
  --tone-tint: #dbeafe;
  --tone-edge: #1b57ad;
}

.cards-tone-everyone {
  --tone-tint: #fde3ef;
  --tone-edge: #a32567;
}

.cards-tone-lucky {
  --tone-tint: #fdf0c8;
  --tone-edge: #7d5105;
}

.cards-tone-skill {
  --tone-tint: #ffe6d2;
  --tone-edge: #9c4415;
}

.cards-tone-rule {
  --tone-tint: #e6e8ec;
  --tone-edge: #454d59;
}
</style>
