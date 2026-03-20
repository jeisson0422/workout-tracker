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
</script>

<template>
  <div class="pb-6">
    <div style="padding:calc(24px + env(safe-area-inset-top,0px)) 20px 10px">
      <div style="font-size:12px;color:var(--text2);font-weight:600;letter-spacing:.5px">ENTRENAMIENTO</div>
      <div style="font-size:28px;font-weight:800;letter-spacing:-.5px;margin-top:4px">
        Semana {{ currentWeek }}
      </div>
      <div style="font-size:12px;color:var(--accent2);margin-top:3px;font-weight:600">
        {{ (info.phase||'').toUpperCase() }} · RPE {{ info.rpe_target||'?' }}
      </div>
    </div>

    <div>
      <DayCard 
        v-for="(day, di) in days" 
        :key="di"
        :day-index="di"
        :day-label="day.session_name || `Día ${di+1}`"
        :exercises="day.exercises || []"
        :is-done="(store.dbUpdateTrigger || true) && store.isDayComplete(day.session_name || `Día ${di+1}`)"
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
