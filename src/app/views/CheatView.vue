<template>
  <section data-testid="cheat-view" class="flex flex-col gap-6">
    <header class="flex flex-col gap-1">
      <h1 class="font-display text-2xl font-semibold text-ink">Điều khiển</h1>
      <p class="text-sm text-ink-muted">Cài một lần cho mỗi máy.</p>
    </header>

    <div class="flex flex-col gap-3 rounded-2xl border-2 border-border bg-surface-elevated p-4">
      <label class="flex flex-col gap-1">
        <span class="font-semibold text-ink">Mã</span>
        <input
          v-model="secretDraft"
          type="password"
          autocomplete="off"
          class="min-h-11 rounded-xl border-2 border-border bg-surface px-3 text-ink"
          data-testid="cheat-secret-input"
        />
      </label>

      <label class="flex min-h-11 items-center justify-between gap-3">
        <span class="text-ink">Máy này là máy chơi</span>
        <input
          v-model="roleDraft"
          type="radio"
          value="game"
          class="h-5 w-5 accent-teal"
          data-testid="cheat-role-game"
        />
      </label>
      <label class="flex min-h-11 items-center justify-between gap-3">
        <span class="text-ink">Máy này là máy điều khiển</span>
        <input
          v-model="roleDraft"
          type="radio"
          value="admin"
          class="h-5 w-5 accent-teal"
          data-testid="cheat-role-admin"
        />
      </label>

      <button type="button" class="btn-tactile w-full" data-testid="cheat-save" @click="save">
        Lưu
      </button>
    </div>

    <p v-if="savedRole === 'game'" class="toast-banner" data-testid="cheat-role-note" role="status">
      Máy này đang là máy chơi. Không có nút gài ở đây.
    </p>

    <div v-else-if="savedRole === 'admin'" class="flex flex-col gap-4">
      <div
        class="flex flex-col gap-1 rounded-2xl border-2 p-3"
        :class="desired ? 'border-accent bg-accent-soft' : 'border-border bg-surface-muted'"
      >
        <p class="text-sm font-semibold text-ink" data-testid="cheat-status" role="status">
          {{ statusText }}
        </p>
        <p v-if="channelNote" class="text-xs text-ink-muted" data-testid="cheat-channel-note">
          {{ channelNote }}
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-semibold text-ink">Kiểu</span>
        <div class="flex gap-2">
          <button
            v-for="option in MODE_OPTIONS"
            :key="option.mode"
            type="button"
            class="btn-tactile flex-1"
            :class="{ 'cheat-btn--on': mode === option.mode }"
            :aria-pressed="mode === option.mode"
            :data-testid="`cheat-mode-${option.mode}`"
            @click="setMode(option.mode)"
          >
            {{ option.label }}
          </button>
        </div>
        <p class="text-xs text-ink-muted">{{ modeHint }}</p>
      </div>

      <div v-for="group in ARM_GROUPS" :key="group.game" class="flex flex-col gap-2">
        <span class="font-semibold text-ink">{{ group.label }}</span>
        <div class="flex gap-2">
          <button
            v-for="choice in OUTCOME_CHOICES"
            :key="choice.outcome"
            type="button"
            class="btn-tactile flex-1"
            :class="{ 'cheat-btn--on': isActive(group.game, choice.outcome) }"
            :aria-pressed="isActive(group.game, choice.outcome)"
            :data-testid="`cheat-arm-${group.game}-${choice.outcome}`"
            @click="toggle(group.game, choice.outcome)"
          >
            {{ choice.label }}
          </button>
        </div>
      </div>

      <button
        type="button"
        class="btn-tactile w-full"
        :disabled="desired === null"
        data-testid="cheat-disarm"
        @click="disarm"
      >
        Tắt cheat
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import { createCheatSecretStore } from '@/cheat/cheatSecret'
import { buildCheatSocketUrl, createCheatLink, type CheatLink } from '@/cheat/useCheatLink'
import { getCheatSocketUrl } from '@/config/site'
import type { SocketRole } from '@/cheat/cheatProtocol'
import type { ArmedCheat, CheatGameId, CheatMode, ForcedOutcome } from '@/cheat/cheatTypes'

const ARM_GROUPS: readonly { game: CheatGameId; label: string }[] = [
  { game: 'crocodile', label: 'Răng cá sấu' },
  { game: 'mine', label: 'Bắt ếch' },
]
const OUTCOME_CHOICES: readonly { outcome: ForcedOutcome; label: string }[] = [
  { outcome: 'lose', label: 'Cho thua' },
  { outcome: 'win', label: 'Cho thoát' },
]
const MODE_OPTIONS: readonly { mode: CheatMode; label: string }[] = [
  { mode: 'once', label: '1 lần' },
  { mode: 'sticky', label: 'Liên tục' },
]
const GAME_LABELS: Record<CheatGameId, string> = {
  crocodile: 'Răng cá sấu',
  mine: 'Bắt ếch',
}
const OUTCOME_LABELS: Record<ForcedOutcome, string> = { lose: 'cho thua', win: 'cho thoát' }
const MODE_LABELS: Record<CheatMode, string> = { once: '1 lần', sticky: 'liên tục' }

const store = createCheatSecretStore()
const secretDraft = ref('')
const roleDraft = ref<SocketRole>('admin')
const savedRole = ref<SocketRole | null>(null)
const link = shallowRef<CheatLink | null>(null)
const mode = ref<CheatMode>('once')
/*
 * What this screen last asked for. Kept apart from the server's answer so a tap lights the button
 * on the same frame — waiting for the round trip is what made it feel like nothing happened.
 */
const desired = ref<ArmedCheat | null>(null)

const confirmed = computed(() => link.value?.armed.value ?? null)

const modeHint = computed(() =>
  mode.value === 'once'
    ? 'Bẫy chờ sẵn, ăn đúng một lần ấn rồi tự tắt.'
    : 'Mọi lần ấn đều ăn, kể cả của bé, cho tới khi bấm Tắt cheat.',
)

function sameArm(a: ArmedCheat | null, b: ArmedCheat | null): boolean {
  if (a === null || b === null) {
    return a === b
  }
  return a.game === b.game && a.outcome === b.outcome && a.mode === b.mode
}

/*
 * Armed state and presence are independent facts: the room stores an arm with no game device
 * connected and replays it on connect. Reporting only presence hid whether the tap had landed.
 */
const statusText = computed(() => {
  const wanted = desired.value
  const server = confirmed.value

  let armedPart: string
  if (wanted === null) {
    armedPart = server === null ? 'Chưa gài gì' : 'Đang tắt…'
  } else {
    const label = `${GAME_LABELS[wanted.game]} — ${OUTCOME_LABELS[wanted.outcome]} (${MODE_LABELS[wanted.mode]})`
    armedPart = sameArm(wanted, server) ? `Đã gài: ${label}` : `Đang gửi: ${label}`
  }

  const presencePart = link.value?.gameOnline.value
    ? 'Máy chơi đang online'
    : 'Máy chơi chưa online — bẫy vẫn chờ sẵn'

  return `${armedPart}. ${presencePart}.`
})

const channelNote = computed(() => {
  const current = link.value
  if (!current) {
    return 'Chưa cấu hình kênh điều khiển (VITE_CHEAT_SOCKET_URL).'
  }
  return current.connected.value ? '' : 'Đang kết nối tới kênh điều khiển…'
})

// A one-shot spent by a press clears on the server; drop the local highlight to match.
watch(confirmed, (server) => {
  if (server === null && desired.value?.mode === 'once') {
    desired.value = null
  }
})

function isActive(game: CheatGameId, outcome: ForcedOutcome): boolean {
  const wanted = desired.value
  return wanted !== null && wanted.game === game && wanted.outcome === outcome
}

function push(next: ArmedCheat | null): void {
  desired.value = next
  if (next === null) {
    link.value?.disarm()
    return
  }
  link.value?.arm(next)
}

function toggle(game: CheatGameId, outcome: ForcedOutcome): void {
  if (isActive(game, outcome)) {
    push(null)
    return
  }
  push({ game, outcome, mode: mode.value })
}

function setMode(next: CheatMode): void {
  mode.value = next
  const wanted = desired.value
  if (wanted !== null) {
    push({ ...wanted, mode: next })
  }
}

function disarm(): void {
  push(null)
}

function openLink(secret: string, role: SocketRole): void {
  link.value?.close()
  link.value = null

  const baseUrl = getCheatSocketUrl()
  if (role !== 'admin' || baseUrl.length === 0) {
    return
  }

  link.value = createCheatLink({
    url: buildCheatSocketUrl(baseUrl, secret, 'admin'),
    role: 'admin',
  })
}

void store.load().then((config) => {
  if (!config) {
    return
  }
  secretDraft.value = config.secret
  roleDraft.value = config.role
  savedRole.value = config.role
  openLink(config.secret, config.role)
})

async function save(): Promise<void> {
  const saved = await store.save({ secret: secretDraft.value, role: roleDraft.value })
  if (!saved) {
    return
  }
  savedRole.value = roleDraft.value
  desired.value = null
  openLink(secretDraft.value.trim(), roleDraft.value)
}

onUnmounted(() => {
  link.value?.close()
})
</script>

<style scoped>
.cheat-btn--on {
  background: var(--color-accent);
  border-color: color-mix(in srgb, var(--color-accent) 80%, var(--color-ink));
  color: white;
}
</style>
