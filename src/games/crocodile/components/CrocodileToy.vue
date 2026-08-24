<template>
  <div
    class="crocodile-toy crocodile-toy--layout-responsive mx-auto w-full max-w-(--crocodile-toy-max)"
    data-testid="crocodile-toy"
    :class="{ 'crocodile-toy--bitten': jawClosed }"
    :data-layout-wide-max-px="String(CROCODILE_LAYOUT_WIDE.toyMaxWidthPx)"
    :data-layout-wide-content-px="String(wideContentWidthPx)"
    :data-layout-narrow-content-px="String(narrowContentWidthPx)"
  >
    <div class="crocodile-ground-shadow" aria-hidden="true" />

    <div
      class="crocodile-jaw crocodile-jaw--lower crocodile-jaw--pass-hits"
      data-testid="crocodile-jaw-lower"
    >
      <img
        class="crocodile-layer crocodile-layer--base"
        :src="BASE_ASSET"
        alt=""
        :draggable="false"
        data-testid="crocodile-base-asset"
      />

      <div
        class="crocodile-tooth-grid crocodile-tooth-grid--layout crocodile-tooth-grid--lower crocodile-tooth-grid--pass-hits"
        data-testid="crocodile-tooth-grid-lower"
      >
        <template v-for="slot in toothSlots" :key="`lower-${slot.index}`">
          <span
            class="crocodile-tooth-socket"
            :class="{ 'crocodile-tooth-socket--revealed': pressedSet.has(slot.index) }"
            :style="toothSocketStyle(slot)"
            :data-testid="`crocodile-tooth-socket-${slot.index}`"
            aria-hidden="true"
          />

          <button
            type="button"
            class="crocodile-tooth crocodile-tooth--touch crocodile-tooth--lower"
            :class="{ 'crocodile-tooth--pressed': pressedSet.has(slot.index) }"
            :style="toothGridStyle(slot)"
            :data-testid="`crocodile-tooth-${slot.index}`"
            :disabled="disabledSet.has(slot.index)"
            :aria-label="toothLabel(slot.index)"
            :aria-pressed="pressedSet.has(slot.index)"
            @click="emit('press', slot.index)"
          >
            <span class="crocodile-tooth-viewport" aria-hidden="true">
              <svg
                class="crocodile-tooth-shape"
                data-testid="crocodile-tooth-shape"
                viewBox="0 0 44 48"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    :id="`tooth-body-${slot.index}`"
                    x1="13"
                    y1="5"
                    x2="34"
                    y2="40"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0" stop-color="#fffdf0" />
                    <stop offset="0.46" stop-color="#f5efd9" />
                    <stop offset="1" stop-color="#cbc3ae" />
                  </linearGradient>
                  <linearGradient
                    :id="`tooth-side-${slot.index}`"
                    x1="10"
                    y1="8"
                    x2="36"
                    y2="43"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0" stop-color="#ded7c3" />
                    <stop offset="1" stop-color="#9e9787" />
                  </linearGradient>
                </defs>
                <path
                  class="crocodile-tooth-shape__side"
                  :d="toothProfile(slot.profileIndex).side"
                  :fill="`url(#tooth-side-${slot.index})`"
                />
                <path
                  class="crocodile-tooth-shape__body"
                  :d="toothProfile(slot.profileIndex).body"
                  :fill="`url(#tooth-body-${slot.index})`"
                />
                <path
                  class="crocodile-tooth-shape__shade"
                  :d="toothProfile(slot.profileIndex).shade"
                />
                <path
                  class="crocodile-tooth-shape__shine"
                  :d="toothProfile(slot.profileIndex).shine"
                />
                <path
                  class="crocodile-tooth-shape__scuff"
                  :d="toothProfile(slot.profileIndex).scuff"
                />
              </svg>
            </span>
          </button>
        </template>
      </div>
    </div>

    <div
      class="crocodile-jaw crocodile-jaw--upper crocodile-jaw--hinged crocodile-jaw--pass-hits"
      data-testid="crocodile-jaw-upper"
      :class="{ 'crocodile-jaw--closed-upper': jawClosed }"
    >
      <img
        class="crocodile-layer crocodile-layer--upper"
        :src="UPPER_JAW_ASSET"
        alt=""
        :draggable="false"
        data-testid="crocodile-upper-jaw-asset"
      />

      <div
        class="crocodile-tooth-grid crocodile-tooth-grid--layout crocodile-tooth-grid--upper crocodile-tooth-grid--pass-hits"
        data-testid="crocodile-tooth-grid-upper"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  CROCODILE_LAYOUT_NARROW,
  CROCODILE_LAYOUT_WIDE,
  computeAllToothSlots,
  computeToyContentWidthPx,
  type CrocodileToothSlot,
} from '../layout'

const BASE_ASSET = '/assets/crocodile/crocodile-base.webp'
const UPPER_JAW_ASSET = '/assets/crocodile/upper-jaw.webp'

interface ToothProfile {
  side: string
  body: string
  shade: string
  shine: string
  scuff: string
}

const TOOTH_PROFILES: readonly ToothProfile[] = [
  {
    side: 'M11 12 Q11 6 17 4 L28 5 Q33 7 33 12 L35 34 Q32 41 28 43 L16 42 Q11 39 9 34Z',
    body: 'M12 9 Q13 4 18 3 L28 4 Q32 6 32 11 L33 32 Q30 38 27 40 L17 39 Q13 37 12 32Z',
    shade: 'M27 4 Q32 6 32 11 L33 32 Q30 38 27 40 L24 40 Q28 29 27 4Z',
    shine: 'M17 8 Q19 5 23 6 L26 6 Q27 7 25 10 L23 17 Q19 15 17 17Z',
    scuff: 'M17 30 Q21 32 25 30',
  },
  {
    side: 'M9 12 Q9 6 16 4 L30 4 Q35 7 35 12 L37 35 Q34 42 29 44 L14 43 Q9 40 7 35Z',
    body: 'M10 9 Q11 4 17 3 L30 4 Q34 6 34 11 L35 33 Q32 39 28 41 L15 40 Q11 38 10 33Z',
    shade: 'M29 4 Q34 6 34 11 L35 33 Q32 39 28 41 L25 41 Q29 29 29 4Z',
    shine: 'M15 8 Q18 5 22 6 L27 6 Q28 8 25 11 L23 19 Q18 17 15 20Z',
    scuff: 'M15 29 Q20 31 25 29',
  },
  {
    side: 'M8 12 Q8 5 15 4 L31 4 Q36 6 36 12 L38 35 Q35 42 30 44 L14 44 Q8 41 6 35Z',
    body: 'M8 9 Q9 3 16 3 L30 3 Q35 5 35 11 L36 33 Q33 39 29 41 L14 41 Q9 38 8 33Z',
    shade: 'M29 4 Q35 6 35 11 L36 33 Q33 39 29 41 L26 41 Q30 31 29 4Z',
    shine: 'M13 9 Q15 6 20 6 L25 6 Q27 7 25 10 L23 20 Q18 18 14 21Z',
    scuff: 'M14 30 Q19 33 25 30',
  },
  {
    side: 'M6 13 Q7 5 15 3 L31 4 Q38 6 38 13 L39 35 Q36 43 30 45 L13 44 Q7 42 5 35Z',
    body: 'M7 10 Q8 3 16 2 L30 3 Q36 5 36 12 L37 33 Q34 40 29 42 L13 41 Q8 39 7 33Z',
    shade: 'M29 3 Q36 5 36 12 L37 33 Q34 40 29 42 L25 42 Q30 29 29 3Z',
    shine: 'M12 9 Q15 5 20 5 L26 6 Q28 8 25 11 L23 21 Q17 18 12 21Z',
    scuff: 'M13 31 Q19 34 26 31',
  },
  {
    side: 'M6 12 Q7 5 14 3 L31 3 Q38 6 38 13 L39 35 Q35 43 29 45 L13 44 Q7 42 5 35Z',
    body: 'M7 9 Q9 2 16 2 L30 3 Q36 5 36 12 L37 33 Q34 40 28 42 L14 41 Q8 39 7 33Z',
    shade: 'M30 3 Q36 5 36 12 L37 33 Q34 40 28 42 L25 42 Q30 30 30 3Z',
    shine: 'M12 8 Q15 4 21 5 L27 6 Q28 8 25 11 L22 20 Q17 18 12 21Z',
    scuff: 'M14 31 Q20 33 27 30',
  },
]

const props = defineProps<{
  upperRowCount: number
  lowerRowCount: number
  pressedIndices: readonly number[]
  disabledIndices: readonly number[]
  jawClosed: boolean
}>()

const emit = defineEmits<{
  press: [index: number]
}>()

const narrowContentWidthPx = computeToyContentWidthPx(CROCODILE_LAYOUT_NARROW)
const wideContentWidthPx = computeToyContentWidthPx(CROCODILE_LAYOUT_WIDE)
const toothSlots = computeAllToothSlots()

const pressedSet = computed(() => new Set(props.pressedIndices))
const disabledSet = computed(() => new Set(props.disabledIndices))

function toothGridStyle(slot: CrocodileToothSlot): Record<string, string> {
  const hitInsetTop = ['2%', '13%', '8%', '7%', '0%', '0%', '0%', '0%', '7%', '8%', '13%', '2%']
  const hitInsetBottom = [
    '40%',
    '40%',
    '41%',
    '5%',
    '0%',
    '0%',
    '0%',
    '0%',
    '5%',
    '41%',
    '41%',
    '40%',
  ]
  const hitWidth = [
    '58px',
    '56px',
    '54px',
    '50px',
    '44px',
    '44px',
    '44px',
    '44px',
    '50px',
    '54px',
    '56px',
    '58px',
  ]
  const hitOffsetX = [
    '-8px',
    '-8px',
    '-7px',
    '-4px',
    '0px',
    '0px',
    '0px',
    '0px',
    '4px',
    '7px',
    '8px',
    '8px',
  ]

  return {
    '--tooth-rotate': `${slot.rotationDeg}deg`,
    '--tooth-scale': String(slot.scale),
    '--tooth-height-scale': String(slot.heightScale),
    '--tooth-pressed-height-scale': String(slot.heightScale * 0.68),
    '--tooth-sink-depth': `${slot.sinkDepthPx}px`,
    '--tooth-pressed-offset': `${slot.pressedOffsetPx}px`,
    '--tooth-highlight-opacity': String(slot.highlightOpacity),
    '--tooth-hit-inset-top': hitInsetTop[slot.index] ?? '0%',
    '--tooth-hit-inset-bottom': hitInsetBottom[slot.index] ?? '0%',
    '--tooth-hit-width': hitWidth[slot.index] ?? '44px',
    '--tooth-hit-offset-x': hitOffsetX[slot.index] ?? '0px',
    left: `${slot.xPercent}%`,
    top: `${slot.yPercent}%`,
  }
}

function toothSocketStyle(slot: CrocodileToothSlot): Record<string, string> {
  return {
    '--socket-rotate': `${slot.rotationDeg}deg`,
    '--socket-width': `${slot.socketWidthPercent}%`,
    '--socket-height': `${slot.socketHeightPercent}%`,
    left: `${slot.xPercent}%`,
    top: `${slot.yPercent}%`,
  }
}

function toothProfile(profileIndex: number): ToothProfile {
  return TOOTH_PROFILES[profileIndex] ?? TOOTH_PROFILES[2]!
}

function toothLabel(index: number): string {
  return `Hàm dưới, răng ${index + 1}`
}
</script>

<style scoped>
.crocodile-toy--layout-responsive {
  --crocodile-toy-max: 20rem;
  --crocodile-jaw-close-y: 32%;
  --crocodile-tooth-hit: clamp(2.5rem, 10.5vw, 2.75rem);
  --crocodile-tooth-lift: -0.3rem;
  position: relative;
  aspect-ratio: 360 / 420;
  overflow: visible;
  isolation: isolate;
}

@media (min-width: 375px) {
  .crocodile-toy--layout-responsive {
    --crocodile-toy-max: 24rem;
  }
}

.crocodile-ground-shadow {
  position: absolute;
  z-index: -1;
  right: 9%;
  bottom: 0.5%;
  left: 9%;
  height: 7%;
  border-radius: 50%;
  background: rgb(32 27 20 / 24%);
  filter: blur(0.65rem);
  transform: scaleY(0.55);
  pointer-events: none;
}

.crocodile-jaw {
  position: absolute;
  inset: 0;
  overflow: visible;
}

.crocodile-jaw--pass-hits,
.crocodile-tooth-grid--pass-hits {
  pointer-events: none;
}

.crocodile-jaw--lower {
  z-index: 2;
}

.crocodile-jaw--upper {
  z-index: 4;
}

.crocodile-layer {
  position: absolute;
  left: 50%;
  display: block;
  width: 100%;
  max-width: none;
  height: auto;
  transform: translateX(-50%);
  pointer-events: none;
  user-select: none;
}

.crocodile-layer--base {
  bottom: 0;
}

.crocodile-toy--bitten .crocodile-layer--base {
  animation: base-occlusion 0.36s linear 0.06s forwards;
}

.crocodile-layer--upper {
  top: 0;
}

.crocodile-jaw--hinged {
  transform-origin: 50% 54.5%;
  will-change: transform;
}

.crocodile-tooth-grid {
  position: absolute;
  inset: 0;
}

.crocodile-tooth--touch {
  position: absolute;
  z-index: 5;
  display: grid;
  width: var(--crocodile-tooth-hit);
  height: var(--crocodile-tooth-hit);
  min-width: var(--crocodile-tooth-hit);
  min-height: var(--crocodile-tooth-hit);
  padding: 0;
  border: 0;
  background: transparent;
  pointer-events: none;
  cursor: pointer;
  place-items: center;
  transform: translate(-50%, -50%);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.crocodile-tooth-socket {
  position: absolute;
  z-index: 3;
  width: var(--socket-width);
  height: var(--socket-height);
  border: 0;
  border-radius: 46% 54% 48% 44% / 39% 42% 58% 61%;
  background:
    radial-gradient(ellipse at 35% 24%, rgb(230 81 72 / 16%) 0 9%, transparent 31%),
    radial-gradient(ellipse at 52% 58%, #6f0711 0 35%, #52020a 68%, #350006 100%);
  box-shadow:
    inset 0 1px 1px rgb(255 113 94 / 11%),
    inset 0 -2px 3px rgb(36 0 5 / 72%);
  clip-path: polygon(
    9% 13%,
    23% 3%,
    73% 2%,
    91% 15%,
    98% 44%,
    91% 77%,
    72% 96%,
    27% 97%,
    8% 81%,
    2% 48%
  );
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -50%) rotate(var(--socket-rotate, 0deg)) scale(0.94);
  transition:
    opacity 0.14s linear,
    transform 0.14s cubic-bezier(0.2, 0.72, 0.28, 1);
}

.crocodile-tooth-socket--revealed {
  opacity: 0.96;
  transform: translate(-50%, -50%) rotate(var(--socket-rotate, 0deg)) scale(1);
}

.crocodile-tooth--touch::before {
  position: absolute;
  top: var(--tooth-hit-inset-top, 0%);
  bottom: var(--tooth-hit-inset-bottom, 0%);
  left: 50%;
  width: var(--tooth-hit-width, 44px);
  content: '';
  pointer-events: auto;
  transform: translateX(calc(-50% + var(--tooth-hit-offset-x, 0px)));
}

.crocodile-tooth-viewport {
  position: absolute;
  bottom: calc(50% - var(--tooth-sink-depth, 2px));
  left: 50%;
  width: 2.75rem;
  height: 3rem;
  overflow: hidden;
  pointer-events: none;
  transform: translateX(-50%);
}

.crocodile-tooth-shape {
  position: absolute;
  z-index: 1;
  top: calc(100% - var(--tooth-sink-depth, 2px));
  left: 50%;
  width: 2.05rem;
  height: 2.7rem;
  overflow: visible;
  filter: drop-shadow(0 3px 1px rgb(78 4 17 / 42%));
  transform: translate(-50%, -50%) translateY(var(--crocodile-tooth-lift))
    rotate(var(--tooth-rotate, 0deg)) scale(var(--tooth-scale, 1))
    scaleY(var(--tooth-height-scale, 1));
  transform-origin: 50% 82%;
  transition:
    transform 0.14s cubic-bezier(0.2, 0.72, 0.28, 1),
    filter 0.14s linear,
    opacity 0.14s linear;
}

.crocodile-tooth-shape__side {
  stroke: #898274;
  stroke-width: 0.75;
}

.crocodile-tooth-shape__body {
  stroke: #c3baa4;
  stroke-width: 0.9;
}

.crocodile-tooth-shape__shade {
  fill: #aaa28f;
  opacity: 0.38;
}

.crocodile-tooth-shape__shine {
  fill: #fffef7;
  opacity: var(--tooth-highlight-opacity, 0.75);
}

.crocodile-tooth-shape__scuff {
  fill: none;
  stroke: #b8af9d;
  stroke-width: 0.75;
  stroke-linecap: round;
  opacity: 0.38;
}

.crocodile-tooth--touch:active:not(:disabled) .crocodile-tooth-shape {
  transform: translate(-50%, -50%) translateY(calc(var(--crocodile-tooth-lift) + 5px))
    rotate(var(--tooth-rotate, 0deg)) scale(var(--tooth-scale, 1))
    scaleY(var(--tooth-height-scale, 1)) scale(0.96);
  filter: drop-shadow(0 1px 0 rgb(78 4 17 / 26%));
}

.crocodile-tooth--pressed .crocodile-tooth-shape {
  transform: translate(-50%, -50%)
    translateY(calc(var(--crocodile-tooth-lift) + var(--tooth-pressed-offset, 5.5px)))
    rotate(var(--tooth-rotate, 0deg)) scale(var(--tooth-scale, 1))
    scaleY(var(--tooth-pressed-height-scale, 0.68));
  filter: brightness(0.88) saturate(0.86) drop-shadow(0 1px 0 rgb(78 4 17 / 22%));
  opacity: 0.96;
}

.crocodile-tooth--pressed .crocodile-tooth-shape__side {
  stroke: #8d806d;
  stroke-width: 0.4;
  opacity: 0.42;
}

.crocodile-tooth--pressed .crocodile-tooth-shape__body {
  stroke: #b4a78f;
  stroke-width: 0.45;
}

.crocodile-tooth--touch:disabled {
  cursor: default;
}

.crocodile-tooth--touch:disabled:not(.crocodile-tooth--pressed) .crocodile-tooth-shape {
  opacity: 0.94;
}

.crocodile-tooth--touch:focus-visible {
  border-radius: 0.8rem;
  outline: 3px solid #173b2a;
  outline-offset: 1px;
}

.crocodile-toy--bitten .crocodile-jaw--closed-upper {
  z-index: 7;
  transform: translateY(var(--crocodile-jaw-close-y));
  animation: jaw-chomp 0.36s linear 0.06s forwards;
}

.crocodile-toy--bitten {
  animation: toy-impact 0.2s linear 0.25s;
}

@keyframes jaw-chomp {
  0% {
    transform: translateY(0) rotate(0deg) scaleY(1);
  }
  16% {
    transform: translateY(-1.2%) rotate(-0.55deg) scaleX(1.006);
  }
  26% {
    transform: translateY(-1.2%) rotate(-0.55deg) scaleX(1.006);
  }
  54% {
    transform: translateY(calc(var(--crocodile-jaw-close-y) + 0.4rem)) rotate(1deg) scaleY(0.985);
  }
  68% {
    transform: translateY(calc(var(--crocodile-jaw-close-y) - 0.16rem)) rotate(-0.3deg);
  }
  80% {
    transform: translateY(calc(var(--crocodile-jaw-close-y) + 0.06rem)) rotate(0.12deg);
  }
  100% {
    transform: translateY(var(--crocodile-jaw-close-y)) rotate(0deg);
  }
}

@keyframes base-occlusion {
  0%,
  26% {
    clip-path: inset(0);
  }
  42%,
  100% {
    clip-path: inset(15% 0 0);
  }
}

@keyframes toy-impact {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
  22% {
    transform: translate(-2px, 1px) rotate(-0.45deg);
  }
  44% {
    transform: translate(2px, -1px) rotate(0.45deg);
  }
  66% {
    transform: translate(-1px, 0) rotate(-0.2deg);
  }
  82% {
    transform: translate(1px, 0) rotate(0.15deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .crocodile-toy--bitten .crocodile-jaw--closed-upper {
    animation: none;
    transform: translateY(var(--crocodile-jaw-close-y));
  }

  .crocodile-toy--bitten {
    animation: none;
  }

  .crocodile-toy--bitten .crocodile-layer--base {
    animation: none;
    clip-path: inset(15% 0 0);
  }

  .crocodile-tooth-shape {
    transition: none;
  }
}
</style>
