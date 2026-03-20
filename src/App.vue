<script setup lang="ts">
import { onMounted } from 'vue'
import { useWorkoutStore } from './stores/workout'
import BottomNav from './components/BottomNav.vue'

const store = useWorkoutStore()

onMounted(async () => {
  await store.initialize()
})
</script>

<template>
  <div class="app-container bg-[#0a0a0f] text-[#f0f0ff]">
    <div v-if="!store.isLoaded" class="flex flex-1 items-center justify-center">
      Cargando...
    </div>
    <div v-else class="main-content">
      <router-view />
    </div>
    <BottomNav />
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
