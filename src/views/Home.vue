<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkoutStore } from '../stores/workout'
import { useUserStore } from '../stores/user'
import { usePlansStore } from '../stores/plans'
import { dbService } from '../services/localDb'
import { getSwalSettings } from '../services/swalHelper'
import { haptic } from '../services/haptics'
import Swal from 'sweetalert2'
import { ArrowRightIcon, PencilIcon } from 'lucide-vue-next'

const router = useRouter()
const store = useWorkoutStore()
const userStore = useUserStore()
const plansStore = usePlansStore()

onMounted(async () => {
  store.dbUpdateTrigger; // forzar reactividad
})

const streakWeeks = computed(() => {
  store.dbUpdateTrigger;
  const planId = plansStore.activePlan?.id;
  const targetDays = userStore.profile.days_per_week || 0;
  const current = store.currentWeek;
  if (!planId || !targetDays || current <= 1) return 0;

  const r = dbService.q(`
    SELECT week, COUNT(DISTINCT day_label)
    FROM workout_log
    WHERE exercise = '_day_complete' AND plan_id = ? AND week < ?
    GROUP BY week
  `, [planId, current]);

  const completedMap = new Map<number, number>();
  if (r.length && r[0].values) {
    for (const row of r[0].values as any[]) completedMap.set(Number(row[0]), Number(row[1]));
  }

  let streak = 0;
  for (let w = current - 1; w >= 1; w--) {
    if ((completedMap.get(w) || 0) >= targetDays) streak++;
    else break;
  }
  return streak;
})

const currentWeek = computed(() => {
  store.dbUpdateTrigger; // forzar reactividad
  return store.currentWeek;
})
const info = computed(() => {
  store.dbUpdateTrigger; // forzar reactividad
  return store.getWeekInfo(currentWeek.value);
})

const totalSets = computed(() => {
  store.dbUpdateTrigger; // forzar reactividad
  return store.calcTotalSets();
})
const doneSets = computed(() => {
  store.dbUpdateTrigger; // forzar reactividad
  return store.getLoggedSets(currentWeek.value);
})
const pct = computed(() => totalSets.value > 0 ? Math.min(100, Math.round((doneSets.value / totalSets.value) * 100)) : 0)

const totalWeeks = computed(() => {
  store.dbUpdateTrigger; // force reactivity
  return store.totalWeeks;
})

// Nuevas variables computadas para las mejoras
const days = computed(() => {
  store.dbUpdateTrigger;
  return store.getDays()
})

const daysStatus = computed(() => {
  return days.value.map((d: any) => {
    const label = d.session_name || `Día ${d.day_number}`
    return {
      label,
      isComplete: store.isDayComplete(label)
    }
  })
})

const nextWorkout = computed(() => {
  store.dbUpdateTrigger;
  const idx = store.getCurrentDayIndex()
  const day = days.value[idx]
  if (!day) return null
  return {
    index: idx,
    name: day.session_name || `Día ${day.day_number}`
  }
})

const phaseMessage = computed(() => {
  const phase = info.value.phase || 'density'
  switch (phase.toLowerCase()) {
    case 'deload': return 'Semana de descarga. Enfócate en la técnica, recupera energías y no llegues al fallo.'
    case 'adaptation': return 'Fase de adaptación. Prepara tus músculos y articulaciones para el volumen.'
    case 'density': return 'Fase de densidad. El objetivo es acumular volumen de trabajo y construir músculo.'
    case 'intensity': return 'Fase de intensidad. Prepárate mentalmente para mover cargas más pesadas.'
    case 'peaking': return 'Semana de pico. Reduce el volumen, maximiza el peso. ¡A por tus nuevos récords!'
    default: return 'Continúa con tu progreso, mantén la buena técnica en cada repetición.'
  }
})

function setWeek(w: number) {
  store.setWeek(w)
}

function startNextWorkout() {
  router.push('/today')
}

function getCellClass(w: number, phase: string) {
  let base = `week-cell ph-${phase || 'density'}`
  if (w === currentWeek.value) base += ' current'
  if (w < currentWeek.value) base += ' past'
  return base
}

async function quickWeightEntry() {
  const { value: weight } = await Swal.fire({
    ...getSwalSettings(),
    title: 'Registrar Peso',
    input: 'number',
    inputLabel: 'Peso actual (kg)',
    inputValue: userStore.profile.weight_kg || '',
    showCancelButton: true,
    inputValidator: (value) => {
      const num = parseFloat(value)
      if (isNaN(num) || num <= 0) {
        return 'Por favor ingresa un peso válido'
      }
    }
  })

  if (weight) {
    userStore.addWeightEntry(parseFloat(weight))
    haptic('success')
    Swal.fire({
      ...getSwalSettings('success'),
      title: '¡Peso Guardado!',
      text: `${weight} kg registrado`,
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    })
  }
}

const PHASE_LABELS: Record<string, string> = {
  adaptation: 'Adaptación', density: 'Densidad', intensity: 'Intensidad', deload: 'Descarga', peaking: 'Pico'
}
const phaseKey = computed(() => (info.value.phase || 'density').toLowerCase())
const phaseLabel = computed(() => PHASE_LABELS[phaseKey.value] || phaseKey.value)
const focusText = computed(() => {
  const f = (info.value.system_focus || '').replace(/_/g, ' ')
  return f ? f.charAt(0).toUpperCase() + f.slice(1) : ''
})

// El enfoque puede ser una frase larga: en el encabezado solo cabe si es corto;
// completo se lee en "Parámetros de esta fase".
const shortFocus = computed(() => (focusText.value.length <= 36 ? focusText.value : ''))

const weekCells = computed(() => {
  store.dbUpdateTrigger;
  return Array.from({ length: totalWeeks.value }, (_, i) => {
    const w = i + 1
    const phase = (store.getWeekInfo(w).phase || 'density').toLowerCase()
    return { w, phase, label: PHASE_LABELS[phase] || phase }
  })
})
</script>

<template>
  <div class="home">
    <header class="head">
      <div class="head-row">
        <h1 class="display week-title">Semana {{ currentWeek }}<small>de {{ totalWeeks }}</small></h1>
        <button class="weight-chip" @click="quickWeightEntry" aria-label="Registrar peso corporal">
          <template v-if="userStore.profile.weight_kg">
            <strong>{{ userStore.profile.weight_kg }}</strong> kg
          </template>
          <template v-else>Anotar peso</template>
          <PencilIcon aria-hidden="true" />
        </button>
      </div>
      <p class="phase-line" :class="'ph-' + phaseKey">
        <span class="phase-swatch" aria-hidden="true"></span>
        <b>{{ phaseLabel }}</b><span v-if="shortFocus" class="phase-focus">{{ shortFocus }}</span>
      </p>
      <p v-if="streakWeeks > 0" class="streak">
        {{ streakWeeks }} {{ streakWeeks === 1 ? 'semana seguida' : 'semanas seguidas' }} cumpliendo tus días
      </p>
    </header>

    <button v-if="nextWorkout" class="hero" :class="{ 'hero-long': nextWorkout.name.length > 24 }" @click="startNextWorkout">
      <span class="hero-lbl">Siguiente sesión</span>
      <span class="display hero-name">{{ nextWorkout.name }}</span>
      <span class="hero-cta">Empezar <ArrowRightIcon aria-hidden="true" /></span>
    </button>
    <router-link v-else to="/stats" class="hero hero-done">
      <span class="hero-lbl">Semana completa</span>
      <span class="display hero-name">Buen trabajo</span>
      <span class="hero-cta">Ver estadísticas <ArrowRightIcon aria-hidden="true" /></span>
    </router-link>

    <section class="block">
      <div class="block-head">
        <h2>Tu semana</h2>
        <span class="display pct">{{ pct }}%</span>
      </div>
      <ul class="days-checklist">
        <li v-for="(day, idx) in daysStatus" :key="idx" class="day-check" :class="{ done: day.isComplete }">
          <span class="check-box" aria-hidden="true">
            <svg v-if="day.isComplete" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </span>
          <span class="day-name">{{ day.label }}</span>
          <span class="day-state">{{ day.isComplete ? 'Hecho' : 'Pendiente' }}</span>
        </li>
      </ul>
      <div class="prog-bar" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100" aria-label="Series completadas esta semana">
        <div class="prog-fill" :style="{ width: pct + '%' }"></div>
      </div>
      <div class="prog-meta">
        <span>{{ doneSets }} de {{ totalSets }} series</span>
        <span>RPE meta <b>{{ info.rpe_target ?? '—' }}</b></span>
      </div>
    </section>

    <p class="note" :class="'ph-' + phaseKey">{{ phaseMessage }}</p>

    <section class="block">
      <div class="block-head">
        <h2>Macrociclo</h2>
      </div>
      <div class="week-grid">
        <button
          v-for="c in weekCells"
          :key="c.w"
          :class="getCellClass(c.w, c.phase)"
          :aria-label="`Semana ${c.w}, ${c.label}`"
          :aria-current="c.w === currentWeek ? 'true' : undefined"
          @click="setWeek(c.w)"
        >
          <span class="display cell-num">{{ c.w }}</span>
          <span v-if="c.phase === 'deload'" class="cell-glyph" aria-hidden="true">▼</span>
          <span v-else-if="c.phase === 'peaking'" class="cell-glyph" aria-hidden="true">▲</span>
        </button>
      </div>
      <ul class="legend">
        <li v-for="(l, k) in PHASE_LABELS" :key="k" class="leg-item" :class="'ph-' + k">
          <span class="leg-dot" aria-hidden="true"></span>{{ l }}
        </li>
      </ul>
    </section>

    <section class="block">
      <div class="block-head"><h2>Parámetros de esta fase</h2></div>
      <dl class="params">
        <div><dt>Peso</dt><dd>{{ info.weight_change_pct || '—' }}</dd></div>
        <div><dt>Reps</dt><dd>{{ info.reps_change || '—' }}</dd></div>
        <div><dt>RPE</dt><dd>{{ info.rpe_target || '—' }}</dd></div>
        <div :class="{ stacked: focusText.length > 28 }"><dt>Enfoque</dt><dd>{{ focusText || '—' }}</dd></div>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.home { padding-bottom: 28px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.head { padding: calc(22px + env(safe-area-inset-top,0px)) 20px 16px; }
.head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.week-title { font-size: 52px; margin: 0; }
.week-title small { font-size: 22px; font-weight: 600; color: var(--text3); margin-left: 8px; letter-spacing: 0; }
.weight-chip {
  display: inline-flex; align-items: center; gap: 5px; margin-top: 6px;
  padding: 7px 11px; border: 1.5px solid var(--border2); border-radius: 999px;
  background: transparent; color: var(--text2); font: inherit; font-size: 13px; cursor: pointer; white-space: nowrap;
}
.weight-chip strong { color: var(--text); font-size: 15px; }
.weight-chip svg { width: 13px; height: 13px; }
.phase-line { display: flex; align-items: center; gap: 8px; margin: 10px 0 0; font-size: 15px; color: var(--text2); }
.phase-line b { color: var(--text); flex-shrink: 0; }
.phase-focus::before { content: '·'; margin: 0 8px 0 0; }
.phase-swatch { width: 14px; height: 14px; border-radius: 50%; background: var(--ph); box-shadow: inset 0 0 0 3px var(--bg), 0 0 0 1.5px var(--ph); flex-shrink: 0; }
.streak { margin: 6px 0 0 22px; font-size: 13px; color: var(--text2); }

/* Pieza memorable: la sesión de hoy como marcador */
.hero {
  display: flex; flex-direction: column; align-items: flex-start; gap: 6px; text-align: left;
  width: calc(100% - 32px); margin: 0 16px 18px; padding: 18px 18px 16px;
  background: var(--accent); color: var(--accent-text);
  border: none; border-radius: var(--r); cursor: pointer; text-decoration: none; font-family: inherit;
}
.hero:active { transform: scale(0.985); }
.hero-lbl { font-size: 13px; font-weight: 600; opacity: .8; }
.hero-name { font-size: 44px; text-wrap: balance; overflow-wrap: anywhere; }
.hero-long .hero-name { font-size: 32px; line-height: 1; }
.hero-cta { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; padding: 9px 14px; background: var(--accent-text); color: var(--accent); border-radius: 999px; font-size: 14px; font-weight: 700; }
.hero-cta svg { width: 16px; height: 16px; }
.hero-done { background: var(--bg2); color: var(--text); border: 1.5px solid var(--border); }
.hero-done .hero-cta { background: var(--accent); color: var(--accent-text); }

.block { margin: 0 16px 18px; padding: 16px; background: var(--bg2); border: 1.5px solid var(--border); border-radius: var(--r); }
.block-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
.block-head h2 { margin: 0; font-size: 15px; font-weight: 700; }
.pct { font-size: 30px; }

.days-checklist { list-style: none; margin: 0 0 14px; padding: 0; }
.day-check { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); color: var(--text2); }
.day-check:first-child { padding-top: 0; }
.day-check.done { color: var(--text); }
.day-state { margin-left: auto; font-size: 13px; color: var(--text3); }
.day-check.done .day-state { color: var(--text); font-weight: 600; }
.check-box { width: 18px; height: 18px; border: 1.5px solid var(--border2); border-radius: 5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.day-check.done .check-box { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
.check-box svg { width: 11px; height: 11px; }
.day-name { font-size: 15px; font-weight: 600; line-height: 1.25; }

.prog-bar { height: 10px; background: var(--bg3); border-radius: 2px; overflow: hidden; }
.prog-fill { height: 100%; background: var(--accent); transition: width .4s; }
.prog-meta { display: flex; justify-content: space-between; margin-top: 8px; font-size: 13px; color: var(--text2); }
.prog-meta b { color: var(--text); }

.note { margin: 0 16px 18px; padding: 2px 0 2px 14px; border-left: 4px solid var(--ph); font-size: 14px; line-height: 1.5; color: var(--text); }

.week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.week-cell {
  position: relative; aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  border: 1.5px solid var(--border); border-bottom: 5px solid var(--ph); border-radius: 6px;
  background: var(--bg2); color: var(--text2); cursor: pointer; padding: 0; font-family: inherit;
}
.cell-num { font-size: 20px; }
.cell-glyph { position: absolute; top: 2px; right: 3px; font-size: 9px; line-height: 1; color: var(--ph); }
.week-cell.past { background: var(--ph); border-color: var(--ph); color: var(--ph-ink); }
.week-cell.past .cell-glyph { color: var(--ph-ink); }
.week-cell.current { color: var(--text); border-color: var(--text); box-shadow: 0 0 0 2px var(--bg2), 0 0 0 4px var(--text); }
.week-cell.current.past { color: var(--ph-ink); }

.legend { list-style: none; display: flex; gap: 6px 14px; flex-wrap: wrap; margin: 14px 0 0; padding: 0; }
.leg-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text2); }
.leg-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--ph); }

.params { margin: 0; }
.params > div { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 16px; padding: 10px 0; border-bottom: 1px solid var(--border); }
.params > div:first-child { padding-top: 0; }
.params > div:last-child { padding-bottom: 0; border-bottom: none; }
.params dt { font-size: 14px; color: var(--text2); flex-shrink: 0; }
.params dd { margin: 0; font-size: 15px; font-weight: 600; text-align: right; }
.params > div.stacked dd { flex-basis: 100%; text-align: left; font-weight: 500; line-height: 1.45; color: var(--text); }
</style>
