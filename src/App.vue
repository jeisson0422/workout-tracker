<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkoutStore } from './stores/workout'
import { useAuthStore } from './stores/auth'
import BottomNav from './components/BottomNav.vue'

const store = useWorkoutStore()
const authStore = useAuthStore()
const route = useRoute()

onMounted(async () => {
  await authStore.initialize()
  await store.initialize()
})

const isAppReady = computed(() => store.isLoaded && authStore.isInitialized)
const showBottomNav = computed(() => !route.meta.hideNav)
</script>

<template>
  <div class="app-container bg-[#0a0a0f] text-[#f0f0ff]">
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
</style>
