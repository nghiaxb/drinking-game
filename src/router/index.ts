import { createRouter, createWebHistory } from 'vue-router'
import { createRouterRoutes } from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: createRouterRoutes(),
})

export default router
