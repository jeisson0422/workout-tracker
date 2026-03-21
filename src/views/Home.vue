<script setup lang="ts">
import { computed } from 'vue'
import { useWorkoutStore } from '../stores/workout'

const store = useWorkoutStore()

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

function setWeek(w: number) {
  store.setWeek(w)
}

function getCellClass(w: number, phase: string) {
  let base = `week-cell phase-${phase || 'density'}`
  if (w === currentWeek.value) base += ' current'
  if (w < currentWeek.value) base += ' past'
  return base
}
</script>

<template>
  <div class="pb-6">
    <div style="padding:calc(24px + env(safe-area-inset-top,0px)) 20px 10px">
      <div style="font-size:12px;color:var(--text2);font-weight:600;letter-spacing:.5px">MACROCICLO 14 SEMANAS</div>
      <div style="font-size:30px;font-weight:800;letter-spacing:-.5px;margin-top:4px">
        Semana <span>{{ currentWeek }}</span>
        <span style="color:var(--text2);font-size:20px;font-weight:400"> / 14</span>
      </div>
      <div style="font-size:13px;color:var(--accent2);margin-top:4px;font-weight:600">
        {{ (info.phase || '').toUpperCase() }} · {{ (info.system_focus || '').replace(/_/g,' ') }}
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:13px;color:var(--text2);font-weight:600">PROGRESO SEMANA</span>
        <span style="font-size:14px;font-weight:700;color:var(--accent2)">{{ pct }}%</span>
      </div>
      <div class="prog-bar"><div class="prog-fill" :style="{ width: pct + '%' }"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:var(--text3)">
        <span>{{ doneSets }} / {{ totalSets }} sets</span>
        <span>RPE meta: <span style="color:var(--accent2);font-weight:600">{{ info.rpe_target ?? '—' }}</span></span>
      </div>
    </div>

    <div class="week-grid">
      <div 
        v-for="w in 14" 
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
      <div class="card-title">Parámetros esta semana</div>
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
</style>
