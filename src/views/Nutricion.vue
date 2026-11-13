<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronRightIcon } from 'lucide-vue-next'
import { useNutritionStore } from '../stores/nutrition'
import { useWorkoutStore } from '../stores/workout'
import { DAY_SHORT, DAY_NAMES, PACE_LABEL } from '../nutrition/plan'
import DayPanel from '../components/nutrition/DayPanel.vue'

const route = useRoute()
const store = useNutritionStore()
const workout = useWorkoutStore()

// Comida sigue el calendario (hoy = día de la semana), no la sesión de entrenamiento.
// Se puede abrir otro día con ?dia=0..6 (desde Plan completo).
function initialDay(): number {
  const q = Number(route.query.dia)
  return Number.isInteger(q) && q >= 0 && q <= 6 ? q : store.todayIndex
}
const day = ref(initialDay())

const today = new Date().toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })

const phaseKey = computed(() => (workout.getWeekInfo(workout.currentWeek).phase || 'density').toLowerCase())
const dinnerText = computed(() => (store.dinner === 'arepa' ? 'cena con arepa' : 'cena con camote o papa'))
</script>

<template>
  <div class="comida">
    <header class="screen-head">
      <h1 class="display screen-title">Comida</h1>
      <p class="screen-sub">{{ today }}</p>
    </header>

    <div class="days" role="group" aria-label="Día de la semana">
      <button v-for="(s, i) in DAY_SHORT" :key="s" class="day" :class="{ today: i === store.todayIndex }" :aria-pressed="day === i" :aria-label="`${DAY_NAMES[i]}${i === store.todayIndex ? ', hoy' : ''}`" @click="day = i">
        <b>{{ s }}</b><span>{{ store.planFor(i).gym ? 'gym' : 'desc.' }}</span>
      </button>
    </div>

    <DayPanel :day="day" />

    <p v-if="store.phaseTip" class="tip" :class="'ph-' + phaseKey">{{ store.phaseTip }}</p>

    <router-link to="/nutricion/plan" class="more">
      <span class="more-text">
        <b>Plan completo</b>
        <small>Semana, súper, preparación y números · ritmo {{ PACE_LABEL[store.pace].toLowerCase() }}, {{ dinnerText }}</small>
      </span>
      <ChevronRightIcon aria-hidden="true" />
    </router-link>
  </div>
</template>

<style scoped>
.comida { padding-bottom: 28px; }
.screen-sub::first-letter { text-transform: uppercase; }

.days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin: 0 16px 14px; }
.day { display: grid; gap: 1px; min-height: 48px; padding: 5px 0; background: transparent; border: 1.5px solid var(--border2); border-radius: var(--r3); color: var(--text2); font: inherit; line-height: 1.15; cursor: pointer; transition: transform 160ms ease-out; }
.day:active { transform: scale(0.97); }
.day b { font-size: 14px; }
.day span { font-size: 10px; }
.day.today b { text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; }
.day[aria-pressed='true'] { background: var(--text); border-color: var(--text); color: var(--bg); }

.tip { margin: 16px 16px 0; padding: 2px 0 2px 14px; border-left: 4px solid var(--ph); font-size: 14px; line-height: 1.5; }

.more { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 16px 16px 0; padding: 14px 16px; background: var(--bg2); border: 1.5px solid var(--border); border-radius: var(--r); color: var(--text); text-decoration: none; transition: transform 160ms ease-out; }
.more:active { transform: scale(0.985); }
.more-text { display: grid; gap: 3px; min-width: 0; }
.more-text b { font-size: 16px; }
.more-text small { font-size: 13px; line-height: 1.4; color: var(--text2); }
.more svg { width: 20px; height: 20px; flex-shrink: 0; color: var(--text3); }
:focus-visible { outline: 3px solid var(--accent2); outline-offset: 2px; }
</style>
