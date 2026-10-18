import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

function getAppVersion() {
  try {
    const commitCount = execSync('git rev-list --count HEAD').toString().trim()
    return `v0.${commitCount}`
  } catch {
    return 'v0.0'
  }
}

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __APP_VERSION__: JSON.stringify(getAppVersion())
  },
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          }
        ]
      },
      includeAssets: ['favicon.svg', 'img/workout-tracker-192x192.png'],
      manifest: {
        name: 'Workout Tracker',
        short_name: 'Workout',
        display: 'standalone',
        background_color: '#141517',
        theme_color: '#f5c800',
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
