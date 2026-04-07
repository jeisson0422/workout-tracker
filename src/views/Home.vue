<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkoutStore } from '../stores/workout'
import { useUserStore } from '../stores/user'
import Swal from 'sweetalert2'

const router = useRouter()
const store = useWorkoutStore()
const userStore = useUserStore()

onMounted(async () => {
  store.dbUpdateTrigger; // forzar reactividad
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
  let base = `week-cell phase-${phase || 'density'}`
  if (w === currentWeek.value) base += ' current'
  if (w < currentWeek.value) base += ' past'
  return base
}

async function quickWeightEntry() {
  const { value: weight } = await Swal.fire({
    title: 'Registrar Peso',
    input: 'number',
    inputLabel: 'Peso actual (kg)',
    inputValue: userStore.profile.weight_kg || '',
    showCancelButton: true,
    confirmButtonColor: '#ccff00',
    cancelButtonColor: '#333333',
    background: '#1a1a1a',
    color: '#ffffff',
    inputValidator: (value) => {
      const num = parseFloat(value)
      if (isNaN(num) || num <= 0) {
        return 'Por favor ingresa un peso válido'
      }
    }
  })

  if (weight) {
    userStore.addWeightEntry(parseFloat(weight))
    Swal.fire({
      title: '¡Registrado!',
      text: `Peso de ${weight}kg guardado.`,
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
      background: '#1a1a1a',
      color: '#ffffff'
    })
  }
}
</script>

<template>
  <div class="pb-6">
    <div style="padding:calc(24px + env(safe-area-inset-top,0px)) 20px 10px">
      <div style="font-size:12px;color:var(--text2);font-weight:600;letter-spacing:.5px">MACROCICLO {{ totalWeeks }} SEMANAS</div>
      <div style="font-size:30px;font-weight:800;letter-spacing:-.5px;margin-top:4px">
        Semana <span>{{ currentWeek }}</span>
        <span style="color:var(--text2);font-size:20px;font-weight:400"> / {{ totalWeeks }}</span>
      </div>
      <div style="font-size:13px;color:var(--accent2);margin-top:4px;font-weight:600">
        {{ (info.phase || '').toUpperCase() }} · {{ (info.system_focus || '').replace(/_/g,' ') }}
      </div>
    </div>

    <!-- Acceso Rápido Peso -->
    <div class="weight-quick-access" @click="quickWeightEntry">
      <div class="weight-info">
        <span class="weight-lbl">PESO ACTUAL:</span>
        <span class="weight-val">{{ userStore.profile.weight_kg || '--' }}<span class="unit">kg</span></span>
      </div>
      <div class="weight-btn">Anotar</div>
    </div>

    <!-- 1. Próximo Entrenamiento (CTA Principal) -->
    <div class="card next-workout-card" v-if="nextWorkout" @click="startNextWorkout">
      <div class="next-info">
        <div class="next-lbl">SIGUIENTE SESIÓN</div>
        <div class="next-val">{{ nextWorkout.name }}</div>
      </div>
      <button class="btn-start">Empezar</button>
    </div>
    <div class="card next-workout-card" v-else>
      <div class="next-info">
        <div class="next-lbl">¡FELICIDADES!</div>
        <div class="next-val">Semana completada</div>
      </div>
    </div>

    <!-- 2. Progreso de la Semana (Modificado con checklist) -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:13px;color:var(--text2);font-weight:600">TU SEMANA</span>
        <span style="font-size:14px;font-weight:700;color:var(--accent2)">{{ pct }}%</span>
      </div>
      
      <!-- Checklist visual -->
      <div class="days-checklist">
        <div v-for="(day, idx) in daysStatus" :key="idx" class="day-check" :class="{ done: day.isComplete }">
          <div class="check-circle">
            <svg v-if="day.isComplete" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <span class="day-name">{{ day.label }}</span>
        </div>
      </div>

      <div class="prog-bar"><div class="prog-fill" :style="{ width: pct + '%' }"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:var(--text3)">
        <span>{{ doneSets }} / {{ totalSets }} sets</span>
        <span>RPE meta: <span style="color:var(--accent2);font-weight:600">{{ info.rpe_target ?? '—' }}</span></span>
      </div>
    </div>

    <!-- 3. Consejo de Fase -->
    <div class="card advice-card">
      <div style="display:flex; gap:12px; align-items:flex-start;">
        <div class="advice-icon">💡</div>
        <div class="advice-text">
          {{ phaseMessage }}
        </div>
      </div>
    </div>

    <div class="week-grid">
      <div 
        v-for="w in totalWeeks" 
        :key="w"
        :class="getCellClass(w, store.getWeekInfo(w).phase)"
        @click="setWeek(w)"
      >
        {{ w }}
      </div>
    </div>

    <div class="legend">
      <div class="leg-item"><div class="leg-dot" style="background:var(--accent)"></div>Adaptación</div>
      <div class="leg-item"><div class="leg-dot" style="background:var(--green)"></div>Descarga</div>
      <div class="leg-item"><div class="leg-dot" style="background:var(--amber)"></div>Pico</div>
      <div class="leg-item"><div class="leg-dot" style="background:var(--blue)"></div>Densidad</div>
      <div class="leg-item"><div class="leg-dot" style="background:#fb923c"></div>Intensidad</div>
    </div>

    <div class="card">
      <div class="card-title">Parámetros de la fase</div>
      <div style="font-size:13px;color:var(--text2);line-height:2">
        <span><b style="color:var(--text)">Peso:</b> {{ info.weight_change_pct||'—' }}</span>&nbsp;&nbsp;
        <span><b style="color:var(--text)">Reps:</b> {{ info.reps_change||'—' }}</span>&nbsp;&nbsp;
        <span><b style="color:var(--text)">RPE:</b> {{ info.rpe_target||'—' }}</span>&nbsp;&nbsp;
        <span><b style="color:var(--text)">Enfoque:</b> {{ (info.system_focus||'—').replace(/_/g,' ') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 16px;
  margin: 0 16px 12px;
}
.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 12px;
}

/* Nueva tarjeta CTA */
.next-workout-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, var(--bg2), var(--bg3));
  border-left: 4px solid var(--accent);
  cursor: pointer;
  padding: 20px 16px;
}
.next-info { display: flex; flex-direction: column; }
.next-lbl { font-size: 11px; font-weight: 700; color: var(--text2); letter-spacing: 0.5px; margin-bottom: 4px; }
.next-val { font-size: 18px; font-weight: 700; color: var(--text); }
.btn-start {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-start:active { opacity: 0.8; }

/* Checklist de días */
.days-checklist {
  display: flex;
  gap: 12px;
  margin: 12px 0 16px;
  flex-wrap: wrap;
}
.day-check {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0.5;
}
.day-check.done { opacity: 1; }
.check-circle {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bg);
}
.day-check.done .check-circle {
  background: var(--accent);
  border-color: var(--accent);
}
.check-circle svg { width: 10px; height: 10px; }
.day-name { font-size: 12px; font-weight: 600; color: var(--text); }

/* Consejo dinámico */
.advice-card { 
  background: rgba(108, 99, 255, 0.05); 
  border-color: rgba(108, 99, 255, 0.2); 
}
.advice-icon { font-size: 20px; }
.advice-text { font-size: 13px; color: var(--text); line-height: 1.5; font-weight: 500; }

.prog-bar {
  height: 8px;
  border-radius: 4px;
  background: var(--bg3);
  overflow: hidden;
  margin-top: 8px;
}
.prog-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
  transition: width .4s;
}

.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  padding: 16px 16px 0;
}
.week-cell {
  aspect-ratio: 1;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  background: var(--bg2);
  cursor: pointer;
  transition: all .2s;
  font-size: 12px;
  font-weight: 600;
  color: var(--text2);
}

.week-cell.phase-adaptation { background: rgba(108,99,255,.15); border-color: rgba(108,99,255,.35); color: var(--accent2); }
.week-cell.phase-density { background: rgba(96,165,250,.1); border-color: rgba(96,165,250,.3); color: var(--blue); }
.week-cell.phase-intensity { background: rgba(251,146,60,.1); border-color: rgba(251,146,60,.3); color: #fb923c; }
.week-cell.phase-deload { background: rgba(52,211,153,.15); border-color: rgba(52,211,153,.4); color: var(--green); }
.week-cell.phase-peaking { background: rgba(251,191,36,.15); border-color: rgba(251,191,36,.4); color: var(--amber); }

.week-cell.past.phase-adaptation { background: var(--accent); border-color: var(--accent); color: #fff; }
.week-cell.past.phase-density { background: rgba(96,165,250,.3); border-color: var(--blue); color: var(--blue); }
.week-cell.past.phase-intensity { background: rgba(251,146,60,.25); border-color: #fb923c; color: #fb923c; }
.week-cell.past.phase-deload { background: var(--green); border-color: var(--green); color: #fff; }
.week-cell.past.phase-peaking { background: var(--amber); border-color: var(--amber); color: #000; }

.week-cell.current { border-width: 2px; box-shadow: 0 0 0 2px rgba(108,99,255,.25); }
.week-cell.current.phase-adaptation { border-color: var(--accent2); }
.week-cell.current.phase-density { border-color: var(--blue); }
.week-cell.current.phase-intensity { border-color: #fb923c; }
.week-cell.current.phase-deload { border-color: var(--green); }
.week-cell.current.phase-peaking { border-color: var(--amber); }

.legend {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding: 6px 16px 12px;
}
.leg-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text2);
}
.leg-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.weight-quick-access {
  margin: 0 16px 12px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}
.weight-info { display: flex; align-items: center; gap: 8px; }
.weight-lbl { font-size: 11px; font-weight: 700; color: var(--text2); }
.weight-val { font-size: 18px; font-weight: 800; color: var(--accent); }
.weight-val .unit { font-size: 10px; margin-left: 2px; color: var(--text2); }
.weight-btn { font-size: 12px; font-weight: 700; color: var(--accent2); text-transform: uppercase; border: 1px solid var(--accent2); padding: 4px 10px; border-radius: 12px; }
</style>