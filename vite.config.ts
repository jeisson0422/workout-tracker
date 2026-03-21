import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'img/workout-tracker-192x192.png'],
      manifest: {
        name: 'Workout Tracker',
        short_name: 'Workout',
        display: 'standalone',
        background_color: '#0a0a0f',
        theme_color: '#6c63ff',
        icons: [
          {
            src: '/img/workout-tracker-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
