<template>
  <section data-testid="not-found-view" class="flex flex-col items-center gap-4 py-8 text-center">
    <p class="font-display text-5xl font-semibold text-accent" aria-hidden="true">404</p>
    <h1 class="font-display text-2xl font-semibold text-ink">Không tìm thấy trang</h1>
    <p class="max-w-sm text-sm text-ink-muted">Đường dẫn không tồn tại hoặc đã bị di chuyển.</p>
    <RouterLink to="/" class="btn-tactile btn-tactile-primary" data-testid="not-found-home">
      Về trang chủ
    </RouterLink>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
