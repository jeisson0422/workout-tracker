<script setup lang="ts">
import { onMounted, computed, watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkoutStore } from './stores/workout'
import { useAuthStore } from './stores/auth'
import { syncService } from './services/syncService'
import BottomNav from './components/BottomNav.vue'

const store = useWorkoutStore()
const authStore = useAuthStore()
const route = useRoute()

const updateAvailable = ref(false)

onMounted(async () => {
  await authStore.initialize()
  await store.initialize()
  
  if (authStore.user) {
    syncService.startAutoSync()
  }
  
  const buildTime = '__BUILD_TIME__'
  if (buildTime !== '__BUILD_TIME__') {
    const stored = localStorage.getItem('app_build_time')
    if (stored && stored !== buildTime) {
      updateAvailable.value = true
    }
    localStorage.setItem('app_build_time', buildTime)
  }
})

function reloadApp() {
  if ('caches' in window) {
    caches.keys().then(names => names.forEach(name => caches.delete(name)))
  }
  window.location.reload()
}

watch(() => authStore.user, (user) => {
  if (user) {
    syncService.startAutoSync()
  } else {
    syncService.stopAutoSync()
  }
})

const isAppReady = computed(() => store.isLoaded && authStore.isInitialized)
const showBottomNav = computed(() => !route.meta.hideNav)
</script>

<template>
  <div class="app-container bg-bg text-text">
    <div v-if="updateAvailable" class="update-banner">
      Nueva versión disponible
      <button class="update-btn" @click="reloadApp">Actualizar ahora</button>
    </div>
    <div v-if="!isAppReady" class="flex flex-1 items-center justify-center">
      Cargando...
    </div>
    <div v-else class="main-content">
      <router-view />
    </div>
    <BottomNav v-if="isAppReady && showBottomNav" />
  </div>
</template>

<style>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: 430px;
  margin: 0 auto;
}
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.update-banner {
  background: var(--accent);
  color: #fff;
  text-align: center;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.update-btn {
  background: rgba(255,255,255,.2);
  color: #fff;
  border: 1px solid rgba(255,255,255,.3);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
</style>
