<template>
  <section data-testid="home-view" class="flex flex-col gap-4">
    <header class="flex flex-col gap-2">
      <h1 class="font-display text-2xl font-semibold text-ink">Chọn trò chơi</h1>
      <p class="text-sm text-ink-muted">Chạm để bắt đầu — offline sau lần tải đầu.</p>
    </header>

    <ul class="flex flex-col gap-3" role="list">
      <li v-for="game in games" :key="game.id">
        <RouterLink
          :to="game.path"
          class="card-tactile w-full"
          :class="accentClass(game.accent)"
          :data-testid="`home-game-${game.id}`"
        >
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 text-2xl" aria-hidden="true">
            {{ game.emoji }}
          </span>
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="font-display text-lg font-semibold text-ink">{{ game.label }}</span>
            <span class="text-xs text-ink-muted">Chơi ngay</span>
          </span>
          <IconChevronRight :size="22" stroke="2" class="shrink-0 text-ink-muted" aria-hidden="true" />
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { IconChevronRight } from '@tabler/icons-vue'
import { HOME_GAME_CARDS, type HomeGameCard } from '@/app/homeGames'

const games: HomeGameCard[] = HOME_GAME_CARDS

function accentClass(accent: HomeGameCard['accent']): string {
  if (accent === 'teal') {
    return 'border-teal/30 bg-teal-soft/40'
  }
  if (accent === 'amber') {
    return 'border-amber/40 bg-amber-soft/50'
  }
  return 'border-coral/30 bg-accent-soft/40'
}
</script>
