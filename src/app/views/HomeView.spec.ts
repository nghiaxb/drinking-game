import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import HomeView from './HomeView.vue'
import { HOME_GAME_CARDS } from '@/app/homeGames'
import { GAME_ROUTE_PATHS } from '@/router/routes'

describe('HomeView', () => {
  it('renders five game cards with correct labels, emoji and routes', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: HomeView }],
    })

    const wrapper = mount(HomeView, {
      global: { plugins: [router] },
    })

    expect(wrapper.find('[data-testid="home-view"]').exists()).toBe(true)
    expect(HOME_GAME_CARDS).toHaveLength(5)

    for (const game of HOME_GAME_CARDS) {
      const card = wrapper.find(`[data-testid="home-game-${game.id}"]`)
      expect(card.exists()).toBe(true)
      expect(card.text()).toContain(game.label)
      expect(card.text()).toContain(game.emoji)
      expect(card.attributes('href')).toBe(GAME_ROUTE_PATHS[game.id])
    }
  })

  it('uses touch-friendly card layout classes', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: HomeView }],
    })

    const wrapper = mount(HomeView, {
      global: { plugins: [router] },
    })

    const firstCard = wrapper.find('[data-testid="home-game-crocodile"]')
    expect(firstCard.classes()).toContain('card-tactile')
  })
})
