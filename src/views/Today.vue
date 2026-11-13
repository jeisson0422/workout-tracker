<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkoutStore } from '../stores/workout'
import { useNutritionStore } from '../stores/nutrition'
import { syncService } from '../services/syncService'
import { swalInstance, getSwalSettings } from '../services/swalHelper'
import { haptic } from '../services/haptics'
import DayCard from '../components/DayCard.vue'
import LogModal from '../components/LogModal.vue'

const store = useWorkoutStore()
const nutrition = useNutritionStore()

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

    <router-link to="/nutricion" class="food-strip" aria-label="Abrir nutrición">
      <span class="food-main">
        <b>{{ nutrition.todayPlan.gym ? 'Día de gym' : 'Día de descanso' }}</b>
        Meta ~{{ nutrition.todayPlan.target.toLocaleString('en-US') }} kcal · {{ nutrition.todayPlan.protTarget }} g de proteína
      </span>
      <span v-if="nutrition.nextMeal" class="food-next">Sigue: {{ nutrition.nextMeal.time }} · {{ nutrition.nextMeal.name }}</span>
      <span v-else class="food-next">Comidas de hoy completas</span>
    </router-link>

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
.food-strip { display: grid; gap: 4px; margin: 0 16px 14px; padding: 12px 14px; background: var(--bg2); border: 1.5px solid var(--border); border-left: 4px solid var(--accent); border-radius: var(--r); color: var(--text); font-size: 13px; line-height: 1.4; text-decoration: none; }
.food-strip:active { transform: scale(.99); }
.food-main b { display: block; font-size: 15px; }
.food-next { color: var(--text2); }
.finish { padding: 8px 16px 0; }
.finish-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 14px 16px; }
.finish-btn small { font-size: 13px; font-weight: 500; opacity: .75; }
</style>
