<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkoutStore } from '../stores/workout'
import { syncService } from '../services/syncService'
import { swalInstance, getSwalSettings } from '../services/swalHelper'
import { haptic } from '../services/haptics'
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
  if (!dayObj.value) return

  swalInstance.fire({
    ...getSwalSettings(),
    title: '¿Marcar día como completado?',
    html: `<p style="margin:0;line-height:1.5">
      ¿Estás seguro de que terminaste el <strong>${dayLabel.value}</strong>?<br>
      Esta acción quedará registrada.
    </p>`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, marcar como completado',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    showClass: { popup: 'animate__animated animate__fadeInUp animate__faster' },
    hideClass: { popup: 'animate__animated animate__fadeOutDown animate__faster' }
  }).then((result) => {
    if (result.isConfirmed) {
      haptic('success')
      store.markDayComplete(dayLabel.value, dayIndex.value)
      syncService.sync()
    }
  })
}

const loggedCount = computed(() => {
  store.dbUpdateTrigger;
  const exs = dayObj.value?.exercises || []
  return exs.filter((_: any, i: number) => store.loggedThisSession.has(`${dayIndex.value}-${i}`)).length
})
const totalExercises = computed(() => (dayObj.value?.exercises || []).length)
const allLogged = computed(() => totalExercises.value > 0 && loggedCount.value >= totalExercises.value)

const PHASE_LABELS: Record<string, string> = {
  adaptation: 'Adaptación', density: 'Densidad', intensity: 'Intensidad', deload: 'Descarga', peaking: 'Pico'
}
const phaseKey = computed(() => (info.value.phase || 'density').toLowerCase())

const nextDayLabel = computed(() => {
  const days = store.getDays()
  const nextIdx = (dayIndex.value + 1) % days.length
  return days[nextIdx]?.session_name || `Día ${nextIdx + 1}`
})
</script>

<template>
  <div class="today">
    <header class="screen-head">
      <p class="when" :class="'ph-' + phaseKey">
        <span class="phase-swatch" aria-hidden="true"></span>
        Semana {{ currentWeek }} · {{ PHASE_LABELS[phaseKey] || phaseKey }} · RPE {{ info.rpe_target || '?' }}
      </p>
      <h1 class="display screen-title">{{ dayLabel || '—' }}</h1>
      <p v-if="totalExercises" class="screen-sub">{{ loggedCount }} de {{ totalExercises }} ejercicios registrados</p>
    </header>

    <div v-if="dayObj">
      <DayCard
        :day-index="dayIndex"
        :day-label="dayLabel"
        :exercises="dayObj.exercises || []"
        :is-done="false"
        :start-open="true"
        @open-modal="openModal"
      />

      <div class="finish">
        <button class="btn finish-btn" :class="allLogged ? 'btn-primary' : 'btn-secondary'" @click="advanceDay">
          <span>{{ allLogged ? 'Terminé el día' : 'Marcar día como completo' }}</span>
          <small>Sigue: {{ nextDayLabel }}</small>
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
.today { padding-bottom: 24px; }
.when { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-size: 14px; color: var(--text2); }
.phase-swatch { width: 14px; height: 14px; border-radius: 50%; background: var(--ph); box-shadow: inset 0 0 0 3px var(--bg), 0 0 0 1.5px var(--ph); flex-shrink: 0; }
.finish { padding: 8px 16px 0; }
.finish-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 14px 16px; }
.finish-btn small { font-size: 13px; font-weight: 500; opacity: .75; }
</style>
