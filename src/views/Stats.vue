<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dbService } from '../services/localDb'

const kpis = ref({
  workouts: 0,
  totalVolume: 0,
  activeWeeks: 0,
  avgRpe: 0
})

const topPrs = ref<any[]>([])
const weeklyConsistency = ref<any[]>([])
const topExercises = ref<any[]>([])
const maxDays = ref(1)

onMounted(() => {
  const getVal = (sql: string) => {
    const r = dbService.q(sql)
    return r.length && r[0].values.length ? r[0].values[0][0] : 0
  }

  // KPIs Generales
  kpis.value.workouts = getVal("SELECT COUNT(*) FROM workout_log WHERE exercise = '_day_complete'") || 0
  kpis.value.totalVolume = getVal("SELECT SUM(sets * reps * weight_kg) FROM workout_log WHERE exercise != '_day_complete' AND weight_kg > 0") || 0
  kpis.value.activeWeeks = getVal("SELECT COUNT(DISTINCT week) FROM workout_log") || 0
  kpis.value.avgRpe = getVal("SELECT ROUND(AVG(rpe),1) FROM workout_log WHERE rpe > 0 AND exercise != '_day_complete'") || 0

  // Top PRs (Max Weight per exercise, and Est 1RM)
  const prs = dbService.q(`
    SELECT exercise, MAX(weight_kg), ROUND(MAX(weight_kg * (1.0 + (reps / 30.0))), 1)
    FROM workout_log 
    WHERE exercise != '_day_complete' AND weight_kg > 0 
    GROUP BY exercise 
    ORDER BY MAX(weight_kg) DESC 
    LIMIT 5
  `)
  if (prs.length && prs[0].values) {
    topPrs.value = prs[0].values.map((r: any) => ({ exercise: r[0], maxKg: r[1], est1Rm: r[2] }))
  }

  // Consistencia Semanal (Entrenamientos por semana)
  const cons = dbService.q(`
    SELECT week, COUNT(DISTINCT day_label)
    FROM workout_log
    WHERE exercise = '_day_complete'
    GROUP BY week
    ORDER BY week DESC
    LIMIT 8
  `)
  if (cons.length && cons[0].values) {
    // Invertir para mostrar de más antiguo a más reciente
    weeklyConsistency.value = cons[0].values.map((r: any) => ({ week: r[0], days: r[1] })).reverse()
    maxDays.value = Math.max(1, ...weeklyConsistency.value.map(c => c.days))
  }

  // Ejercicios más frecuentes
  const topEx = dbService.q(`
    SELECT exercise, SUM(sets)
    FROM workout_log
    WHERE exercise != '_day_complete'
    GROUP BY exercise
    ORDER BY SUM(sets) DESC
    LIMIT 5
  `)
  if (topEx.length && topEx[0].values) {
    topExercises.value = topEx[0].values.map((r: any) => ({ exercise: r[0], sets: r[1] }))
  }
})
</script>

<template>
  <div class="pb-6">
    <div style="padding:calc(24px + env(safe-area-inset-top,0px)) 20px 10px">
      <div style="font-size:12px;color:var(--text2);font-weight:600;letter-spacing:.5px">ESTADÍSTICAS</div>
      <div style="font-size:28px;font-weight:800;letter-spacing:-.5px;margin-top:4px">Tu Progreso</div>
    </div>
    
    <div class="kpi-grid" style="margin-top:12px">
      <div class="kpi-card"><div class="kpi-val">{{ kpis.workouts }}</div><div class="kpi-lbl">Entrenos</div></div>
      <div class="kpi-card"><div class="kpi-val">{{ Math.round(kpis.totalVolume).toLocaleString() }}</div><div class="kpi-lbl">Volumen (kg)</div></div>
      <div class="kpi-card"><div class="kpi-val">{{ kpis.activeWeeks }}</div><div class="kpi-lbl">Semanas</div></div>
      <div class="kpi-card"><div class="kpi-val">{{ kpis.avgRpe }}</div><div class="kpi-lbl">RPE Prom.</div></div>
    </div>

    <!-- Consistencia (Gráfico de barras) -->
    <div class="card mt-4 mx-4">
      <div class="card-title">Consistencia (Últimas Semanas)</div>
      <div v-if="weeklyConsistency.length === 0" class="empty">Registra días completos para ver tu progreso.</div>
      <div v-else class="chart-container">
        <div v-for="item in weeklyConsistency" :key="item.week" class="chart-bar-wrap">
          <div class="chart-bar" :style="{ height: `${Math.max((item.days / Math.max(maxDays, 7)) * 100, 5)}%` }">
            <span class="bar-val" v-if="item.days > 0">{{ item.days }}d</span>
          </div>
          <div class="chart-lbl">S{{ item.week }}</div>
        </div>
      </div>
    </div>

    <!-- Top PRs -->
    <div class="card mt-4 mx-4">
      <div class="card-title">Récords Personales (Top 5)</div>
      <div v-if="topPrs.length === 0" class="empty">Añade peso a tus ejercicios para ver récords.</div>
      <div class="list-item" v-for="(pr, idx) in topPrs" :key="idx">
        <div class="list-info">
          <div class="list-name">{{ pr.exercise }}</div>
          <div class="list-meta">1RM Est: {{ pr.est1Rm }}kg</div>
        </div>
        <div class="list-val">{{ pr.maxKg }}kg</div>
      </div>
    </div>

    <!-- Ejercicios Frecuentes -->
    <div class="card mt-4 mx-4">
      <div class="card-title">Ejercicios Frecuentes</div>
      <div v-if="topExercises.length === 0" class="empty">Registra series para ver tus preferidos.</div>
      <div class="list-item" v-for="(ex, idx) in topExercises" :key="'ex'+idx">
        <div class="list-info">
          <div class="list-name">{{ ex.exercise }}</div>
        </div>
        <div class="list-val" style="color:var(--text2);font-weight:600">{{ ex.sets }} sets</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 16px 10px; }
.kpi-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r2); padding: 14px 12px; text-align: center; }
.kpi-val { font-size: 24px; font-weight: 700; color: var(--accent2); line-height: 1.1; }
.kpi-lbl { font-size: 11px; color: var(--text2); margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

.card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; }
.card-title { font-size: 13px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 12px; }
.empty { color: var(--text2); font-size: 13px; padding: 8px 0; text-align: center; }

/* Lista de PRs y Ejercicios */
.list-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); gap: 12px; }
.list-item:last-child { border-bottom: none; padding-bottom: 0; }
.list-info { flex: 1; min-width: 0; }
.list-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.list-meta { font-size: 12px; color: var(--text2); margin-top: 2px; }
.list-val { font-size: 14px; font-weight: 700; color: var(--accent); flex-shrink: 0; }

/* Gráfico de Barras CSS */
.chart-container { display: flex; align-items: flex-end; justify-content: space-between; height: 120px; padding-top: 20px; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 8px; }
.chart-bar-wrap { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; width: 100%; max-width: 32px; flex: 1; }
.chart-bar { width: 100%; max-width: 24px; background: var(--accent); border-radius: 4px 4px 0 0; position: relative; min-height: 4px; display: flex; justify-content: center; opacity: 0.9; transition: height 0.3s ease; }
.bar-val { position: absolute; top: -18px; font-size: 10px; font-weight: 600; color: var(--text); }
.chart-lbl { font-size: 10px; color: var(--text2); margin-top: 8px; font-weight: 600; }
</style>