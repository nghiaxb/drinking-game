import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.drinkinggames.app',
  appName: 'Drinking Games',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
