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
      <p class="text-sm text-ink-muted" data-testid="cheat-status" role="status">
        {{ statusText }}
      </p>

      <div v-for="group in ARM_GROUPS" :key="group.game" class="flex flex-col gap-2">
        <span class="font-semibold text-ink">{{ group.label }}</span>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn-tactile btn-tactile-primary flex-1"
            :data-testid="`cheat-arm-${group.game}-lose`"
            @click="arm(group.game, 'lose')"
          >
            Cho thua
          </button>
          <button
            type="button"
            class="btn-tactile flex-1"
            :data-testid="`cheat-arm-${group.game}-win`"
            @click="arm(group.game, 'win')"
          >
            Cho thoát
          </button>
        </div>
      </div>

      <button type="button" class="btn-tactile w-full" data-testid="cheat-disarm" @click="disarm">
        Huỷ bẫy
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, shallowRef } from 'vue'
import { createCheatSecretStore } from '@/cheat/cheatSecret'
import { buildCheatSocketUrl, createCheatLink, type CheatLink } from '@/cheat/useCheatLink'
import { getCheatSocketUrl } from '@/config/site'
import type { SocketRole } from '@/cheat/cheatProtocol'
import type { CheatGameId, ForcedOutcome } from '@/cheat/cheatTypes'

const ARM_GROUPS: readonly { game: CheatGameId; label: string }[] = [
  { game: 'crocodile', label: 'Răng cá sấu' },
  { game: 'mine', label: 'Bắt ếch' },
]

const store = createCheatSecretStore()
const secretDraft = ref('')
const roleDraft = ref<SocketRole>('admin')
const savedRole = ref<SocketRole | null>(null)
const link = shallowRef<CheatLink | null>(null)

const statusText = computed(() => {
  const current = link.value
  if (!current) {
    return 'Chưa cấu hình kênh điều khiển.'
  }
  if (!current.connected.value) {
    return 'Đang kết nối…'
  }
  if (!current.gameOnline.value) {
    return 'Máy chơi chưa online.'
  }
  const armed = current.armed.value
  return armed ? `Đang gài: ${armed.game} / ${armed.outcome}` : 'Máy chơi online — chưa gài gì.'
})

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
  openLink(secretDraft.value.trim(), roleDraft.value)
}

function arm(game: CheatGameId, outcome: ForcedOutcome): void {
  link.value?.arm({ game, outcome })
}

function disarm(): void {
  link.value?.disarm()
}

onUnmounted(() => {
  link.value?.close()
})
</script>
