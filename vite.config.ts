import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

function git(cmd: string) {
  return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
}

// Versión = v0.<número de commits>. Los builds de CI suelen clonar de forma superficial
// (depth 1) y el conteo daba siempre 1, así que se intenta completar el historial y,
// si aun así no es posible, se usa el hash del commit para que cada despliegue cambie.
function getAppVersion() {
  try {
    if (git('rev-parse --is-shallow-repository') === 'true') {
      try { git('fetch --unshallow --quiet') } catch { /* sin acceso al remoto */ }
    }
    if (git('rev-parse --is-shallow-repository') !== 'true') {
      return `v0.${git('rev-list --count HEAD')}`
    }
  } catch { /* sin git */ }
  const sha = (process.env.WORKERS_CI_COMMIT_SHA || process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || '').slice(0, 7)
  return sha ? `v0-${sha}` : 'v0.0'
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
