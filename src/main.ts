import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import { createRouterRoutes } from './router/routes'
import { initPwaUpdate } from './pwa/usePwaUpdate'
import { initPwaInstall } from './pwa/usePwaInstall'
import '@/styles/main.css'

export const createApp = ViteSSG(
  App,
  { routes: createRouterRoutes() },
  ({ isClient }) => {
    if (isClient) {
      initPwaUpdate()
      initPwaInstall()
    }
  },
)
