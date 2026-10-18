<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkoutStore } from '../stores/workout'
import DayCard from '../components/DayCard.vue'
import LogModal from '../components/LogModal.vue'

const store = useWorkoutStore()

const currentWeek = computed(() => store.currentWeek)
const info = computed(() => store.getWeekInfo(currentWeek.value))
const days = computed(() => store.getDays())

const isModalOpen = ref(false)
const modalData = ref(null)

function openModal(data: any) {
  modalData.value = data
  isModalOpen.value = true
}

const PHASE_LABELS: Record<string, string> = {
  adaptation: 'Adaptación', density: 'Densidad', intensity: 'Intensidad', deload: 'Descarga', peaking: 'Pico'
}
</script>

<template>
  <div class="pb-6">
    <div class="s-7b0125">
      <div class="s-de89cf">
        Semana {{ currentWeek }}
      </div>
      <div class="s-eb5388">
        {{ PHASE_LABELS[(info.phase||'').toLowerCase()] || info.phase }} · RPE {{ info.rpe_target||'?' }}
      </div>
    </div>

    <div>
      <DayCard 
        v-for="(day, di) in days" 
        :key="di"
        :day-index="Number(di)"
        :day-label="day.session_name || `Día ${Number(di)+1}`"
        :exercises="day.exercises || []"
        :is-done="Boolean((store.dbUpdateTrigger || true) && store.isDayComplete(day.session_name || `Día ${Number(di)+1}`))"
        @open-modal="openModal"
      />
    </div>

    <LogModal 
      :is-open="isModalOpen" 
      :data="modalData" 
      @close="isModalOpen = false" 
    />
  </div>
</template>

<style scoped>
/* estilos extraídos de atributos inline */
.s-7b0125 { padding:calc(22px + env(safe-area-inset-top,0px)) 20px 14px; }
.s-fbe64e { font-size:12px;color:var(--text2);font-weight:600;letter-spacing:.5px; }
.s-de89cf { font-family:var(--font-display);font-weight:800;font-size:40px;line-height:.95;letter-spacing:.005em; }
.s-eb5388 { font-size:14px;color:var(--text2);margin-top:6px; }
</style>
