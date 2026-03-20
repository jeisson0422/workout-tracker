<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkoutStore } from '../stores/workout'
import DayCard from '../components/DayCard.vue'
import LogModal from '../components/LogModal.vue'

const store = useWorkoutStore()

const currentWeek = computed(() => store.currentWeek)
const info = computed(() => store.getWeekInfo(currentWeek.value))

const dayIndex = computed(() => {
  store.dbUpdateTrigger; // trigger reactivity
  return store.getCurrentDayIndex();
})
const dayObj = computed(() => store.getDays()[dayIndex.value] || null)
const dayLabel = computed(() => dayObj.value?.session_name || `Día ${dayIndex.value + 1}`)

const isModalOpen = ref(false)
const modalData = ref(null)

function openModal(data: any) {
  modalData.value = data
  isModalOpen.value = true
}

function advanceDay() {
  if (dayObj.value) {
    store.markDayComplete(dayLabel.value, dayIndex.value)
  }
}

const nextDayLabel = computed(() => {
  const days = store.getDays()
  const nextIdx = (dayIndex.value + 1) % days.length
  return days[nextIdx]?.session_name || `Día ${nextIdx + 1}`
})
</script>

<template>
  <div class="pb-6">
    <div style="padding:calc(24px + env(safe-area-inset-top,0px)) 20px 10px">
      <div style="font-size:12px;color:var(--text2);font-weight:600;letter-spacing:.5px">HOY</div>
      <div style="font-size:28px;font-weight:800;letter-spacing:-.5px;margin-top:4px">
        {{ dayLabel || '—' }}
      </div>
      <div style="font-size:12px;color:var(--accent2);margin-top:3px;font-weight:600">
        Semana {{ currentWeek }} · {{ (info.phase||'').toUpperCase() }} · RPE {{ info.rpe_target||'?' }}
      </div>
    </div>

    <div v-if="dayObj">
      <DayCard 
        :day-index="dayIndex"
        :day-label="dayLabel"
        :exercises="dayObj.exercises || []"
        :is-done="false"
        :start-open="true"
        @open-modal="openModal"
      />
      
      <div style="padding:12px 16px">
        <button class="btn btn-secondary w-full" @click="advanceDay">
          Marcar día completo → {{ nextDayLabel }}
        </button>
      </div>
    </div>

    <LogModal 
      :is-open="isModalOpen" 
      :data="modalData" 
      @close="isModalOpen = false" 
    />
  </div>
</template>

<style scoped>
.btn { padding: 14px; border-radius: var(--r2); border: none; font-size: 15px; font-weight: 600; cursor: pointer; transition: all .2s; text-align: center; }
.btn-secondary { background: var(--bg2); color: var(--text); border: 1px solid var(--border2); }
</style>
