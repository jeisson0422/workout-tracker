<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { dbService } from '../services/localDb'
import { usePlansStore } from '../stores/plans'

const plansStore = usePlansStore()
const planId = computed(() => plansStore.activePlan?.id || null)

const selectedDay = ref('')

const dayOptions = computed(() => {
  const days = plansStore.activePlanDays || []
  return [
    { label: 'Todos los días', value: '' },
    ...days.map((d: any) => ({
      label: `D${d.day_number} - ${d.session_name}`,
      value: d.session_name
    }))
  ]
})

const kpis = ref({
  workouts: 0,
  totalVolume: 0,
  activeWeeks: 0,
  avgRpe: 0
})

const topPrs = ref<any[]>([])
const weeklyConsistency = ref<any[]>([])
const progressionMatrix = ref<{ weeks: number[]; rows: { exercise: string; weights: Record<number, number | null> }[] }>({ weeks: [], rows: [] })
const maxDays = ref(1)

function loadStats() {
  const pid = planId.value
  if (!pid) return

  const getVal = (sql: string, params: any[] = []) => {
    const r = dbService.q(sql, params)
    return r.length && r[0].values.length ? r[0].values[0][0] : 0
  }

  kpis.value.workouts = getVal("SELECT COUNT(*) FROM workout_log WHERE exercise = '_day_complete' AND plan_id = ?", [pid]) || 0
  kpis.value.totalVolume = getVal("SELECT SUM(sets * reps * weight_kg) FROM workout_log WHERE exercise != '_day_complete' AND weight_kg > 0 AND plan_id = ?", [pid]) || 0
  kpis.value.activeWeeks = getVal("SELECT COUNT(DISTINCT week) FROM workout_log WHERE plan_id = ?", [pid]) || 0
  kpis.value.avgRpe = getVal("SELECT ROUND(AVG(rpe),1) FROM workout_log WHERE rpe > 0 AND exercise != '_day_complete' AND plan_id = ?", [pid]) || 0

  const prs = dbService.q(`
    SELECT exercise, MAX(weight_kg), ROUND(MAX(weight_kg * (1.0 + (reps / 30.0))), 1)
    FROM workout_log
    WHERE exercise != '_day_complete' AND weight_kg > 0 AND plan_id = ?
    GROUP BY exercise
    ORDER BY MAX(weight_kg) DESC
    LIMIT 5
  `, [pid])
  if (prs.length && prs[0].values) {
    topPrs.value = prs[0].values.map((r: any) => ({ exercise: r[0], maxKg: r[1], est1Rm: r[2] }))
  } else {
    topPrs.value = []
  }

  const cons = dbService.q(`
    SELECT week, COUNT(DISTINCT day_label)
    FROM workout_log
    WHERE exercise = '_day_complete' AND plan_id = ?
    GROUP BY week
    ORDER BY week DESC
    LIMIT 8
  `, [pid])
  if (cons.length && cons[0].values) {
    weeklyConsistency.value = cons[0].values.map((r: any) => ({ week: r[0], days: r[1] })).reverse()
    maxDays.value = Math.max(1, ...weeklyConsistency.value.map(c => c.days))
  } else {
    weeklyConsistency.value = []
  }

  loadProgression()
}

function loadProgression() {
  const pid = planId.value
  if (!pid) return

  const dayFilter = selectedDay.value

  let sql: string
  let params: any[]

  if (dayFilter) {
    sql = `
      SELECT exercise, week, MAX(weight_kg)
      FROM workout_log
      WHERE exercise != '_day_complete' AND weight_kg > 0 AND plan_id = ? AND day_label = ?
      GROUP BY exercise, week
      ORDER BY exercise, week
    `
    params = [pid, dayFilter]
  } else {
    sql = `
      SELECT exercise, week, MAX(weight_kg)
      FROM workout_log
      WHERE exercise != '_day_complete' AND weight_kg > 0 AND plan_id = ?
      GROUP BY exercise, week
      ORDER BY exercise, week
    `
    params = [pid]
  }

  const r = dbService.q(sql, params)

  if (!r.length || !r[0].values) {
    progressionMatrix.value = { weeks: [], rows: [] }
    return
  }

  const data = r[0].values as any[][]
  const weekSet = new Set<number>()
  const exerciseMap = new Map<string, Map<number, number>>()

  for (const row of data) {
    const ex = row[0] as string
    const week = Number(row[1])
    const maxKg = Number(row[2])

    weekSet.add(week)
    if (!exerciseMap.has(ex)) {
      exerciseMap.set(ex, new Map())
    }
    exerciseMap.get(ex)!.set(week, maxKg)
  }

  const weeks = Array.from(weekSet).sort((a, b) => a - b)
  const rows = Array.from(exerciseMap.entries()).map(([exercise, weekWeights]) => {
    const weights: Record<number, number | null> = {}
    for (const w of weeks) {
      weights[w] = weekWeights.has(w) ? weekWeights.get(w)! : null
    }
    return { exercise, weights }
  })

  progressionMatrix.value = { weeks, rows }
}

onMounted(() => {
  loadStats()
})

const stalledCount = computed(() => {
  return progressionMatrix.value.rows.filter(row => {
    const weeks = progressionMatrix.value.weeks
    let streak = 0
    for (let i = weeks.length - 1; i >= 0; i--) {
      const w = weeks[i]
      const prev = i > 0 ? weeks[i - 1] : null
      if (row.weights[w] != null && prev != null && row.weights[prev] != null && row.weights[w] === row.weights[prev]) {
        streak++
      } else {
        break
      }
    }
    return streak >= 2
  }).length
})

function isStalled(row: { weights: Record<number, number | null> }, weekIndex: number): boolean {
  const weeks = progressionMatrix.value.weeks
  if (weekIndex < 2) return false
  const w = weeks[weekIndex]
  const prev1 = weeks[weekIndex - 1]
  const prev2 = weeks[weekIndex - 2]
  const curr = row.weights[w]
  const p1 = row.weights[prev1]
  const p2 = row.weights[prev2]
  if (curr == null || p1 == null || p2 == null) return false
  return curr === p1 && curr === p2
}

function rowStallScore(row: { weights: Record<number, number | null> }): number {
  const weeks = progressionMatrix.value.weeks
  let streak = 0
  for (let i = weeks.length - 1; i > 0; i--) {
    const w = weeks[i]
    const prev = weeks[i - 1]
    if (row.weights[w] != null && row.weights[prev] != null && row.weights[w] === row.weights[prev]) {
      streak++
    } else {
      break
    }
  }
  return streak
}

const sortedRows = computed(() => {
  return [...progressionMatrix.value.rows].sort((a, b) => {
    const scoreA = rowStallScore(a)
    const scoreB = rowStallScore(b)
    if (scoreA !== scoreB) return scoreB - scoreA
    return a.exercise.localeCompare(b.exercise)
  })
})

function prevDiff(current: number, prev: number | null): string {
  if (!prev || prev === 0) return ''
  const diff = ((current - prev) / prev) * 100
  if (diff === 0) return ''
  return (diff > 0 ? '+' : '') + diff.toFixed(1) + '%'
}
</script>

<template>
  <div class="pb-6">
    <div style="padding:calc(24px + env(safe-area-inset-top,0px)) 20px 10px">
      <div style="font-size:12px;color:var(--text2);font-weight:600;letter-spacing:.5px">ESTADÍSTICAS</div>
      <div style="font-size:28px;font-weight:800;letter-spacing:-.5px;margin-top:4px">Tu Progreso</div>
    </div>

    <div v-if="!planId" class="card mt-4 mx-4" style="text-align:center">
      <div class="empty">Activa un plan de entrenamiento para ver tus estadísticas.</div>
    </div>

    <template v-else>
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-val">{{ kpis.workouts }}</div><div class="kpi-lbl">Entrenos</div></div>
        <div class="kpi-card"><div class="kpi-val">{{ Math.round(kpis.totalVolume).toLocaleString() }}</div><div class="kpi-lbl">Volumen (kg)</div></div>
        <div class="kpi-card"><div class="kpi-val">{{ kpis.activeWeeks }}</div><div class="kpi-lbl">Semanas</div></div>
        <div class="kpi-card"><div class="kpi-val">{{ kpis.avgRpe }}</div><div class="kpi-lbl">RPE Prom.</div></div>
      </div>

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

      <div class="card mt-4 mx-4">
        <div class="card-title-row">
          <div class="card-title">Progresión de Pesos (kg)</div>
          <select v-model="selectedDay" class="day-filter" @change="loadProgression">
            <option v-for="opt in dayOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <div v-if="stalledCount > 0" class="stall-warning">
          ⚠ {{ stalledCount }} {{ stalledCount === 1 ? 'ejercicio estancado' : 'ejercicios estancados' }} (3+ semanas sin aumento)
        </div>

        <div v-if="sortedRows.length === 0" class="empty">Registra pesos para ver tu progresión.</div>
        <div v-else class="prog-table-wrap">
          <table class="prog-table">
            <thead>
              <tr>
                <th>Ejercicio</th>
                <th v-for="w in progressionMatrix.weeks" :key="w">S{{ w }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in sortedRows" :key="row.exercise">
                <td class="ex-name">
                  <span v-if="rowStallScore(row) >= 2" class="stall-icon" title="Estancado">⚠</span>
                  {{ row.exercise }}
                </td>
                <td v-for="(w, wi) in progressionMatrix.weeks" :key="w" class="weight-cell" :class="{ 'stalled-cell': isStalled(row, wi) }">
                  <template v-if="row.weights[w] !== null && row.weights[w] !== undefined">
                    <span class="weight-val">{{ row.weights[w] }}</span>
                    <span
                      v-if="wi > 0 && row.weights[progressionMatrix.weeks[wi - 1]]"
                      class="weight-diff"
                      :class="{
                        'diff-up': Number(row.weights[w]) > Number(row.weights[progressionMatrix.weeks[wi - 1]]),
                        'diff-down': Number(row.weights[w]) < Number(row.weights[progressionMatrix.weeks[wi - 1]])
                      }"
                    >
                      {{ prevDiff(Number(row.weights[w]), Number(row.weights[progressionMatrix.weeks[wi - 1]])) }}
                    </span>
                  </template>
                  <span v-else class="weight-empty">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card mt-4 mx-4">
        <div class="card-title">Records Personales (Top 5)</div>
        <div v-if="topPrs.length === 0" class="empty">Añade peso a tus ejercicios para ver récords.</div>
        <div class="list-item" v-for="(pr, idx) in topPrs" :key="idx">
          <div class="list-info">
            <div class="list-name">{{ pr.exercise }}</div>
            <div class="list-meta">1RM Est: {{ pr.est1Rm }}kg</div>
          </div>
          <div class="list-val">{{ pr.maxKg }}kg</div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 16px 10px; margin-top: 12px; }
.kpi-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r2); padding: 14px 12px; text-align: center; }
.kpi-val { font-size: 24px; font-weight: 700; color: var(--accent2); line-height: 1.1; }
.kpi-lbl { font-size: 11px; color: var(--text2); margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

.card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; }
.card-title { font-size: 13px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 12px; }
.card-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 8px; }
.card-title-row .card-title { margin-bottom: 0; }
.empty { color: var(--text2); font-size: 13px; padding: 8px 0; text-align: center; }

.day-filter {
  background: var(--bg); color: var(--text); border: 1px solid var(--border);
  border-radius: var(--r1); font-size: 12px; padding: 5px 8px; font-weight: 600;
  max-width: 160px; outline: none;
}

.list-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); gap: 12px; }
.list-item:last-child { border-bottom: none; padding-bottom: 0; }
.list-info { flex: 1; min-width: 0; }
.list-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.list-meta { font-size: 12px; color: var(--text2); margin-top: 2px; }
.list-val { font-size: 14px; font-weight: 700; color: var(--accent); flex-shrink: 0; }

.chart-container { display: flex; align-items: flex-end; justify-content: space-between; height: 120px; padding-top: 20px; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 8px; }
.chart-bar-wrap { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; width: 100%; max-width: 32px; flex: 1; }
.chart-bar { width: 100%; max-width: 24px; background: var(--accent); border-radius: 4px 4px 0 0; position: relative; min-height: 4px; display: flex; justify-content: center; opacity: 0.9; transition: height 0.3s ease; }
.bar-val { position: absolute; top: -18px; font-size: 10px; font-weight: 600; color: var(--text); }
.chart-lbl { font-size: 10px; color: var(--text2); margin-top: 8px; font-weight: 600; }

.prog-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 0 -4px; }
.prog-table { width: 100%; border-collapse: collapse; font-size: 13px; white-space: nowrap; }
.prog-table th { color: var(--text2); font-weight: 600; font-size: 11px; padding: 6px 8px; border-bottom: 1px solid var(--border); text-align: center; }
.prog-table th:first-child { text-align: left; padding-left: 4px; }
.prog-table td { padding: 8px; border-bottom: 1px solid var(--border); text-align: center; }
.prog-table td:first-child { padding-left: 4px; }
.prog-table tbody tr:last-child td { border-bottom: none; }
.ex-name { text-align: left !important; max-width: 140px; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }

.weight-cell { position: relative; }
.weight-val { font-weight: 700; color: var(--text); }
.weight-diff { display: block; font-size: 10px; margin-top: 1px; }
.diff-up { color: var(--green); }
.diff-down { color: var(--red); }
.weight-empty { color: var(--text3); }

.stall-warning {
  background: rgba(251,191,36,.12); color: var(--amber, #d97706);
  font-size: 12px; font-weight: 600; padding: 8px 12px; border-radius: var(--r1);
  margin-bottom: 10px; text-align: center;
}
.stall-icon { margin-right: 3px; }
.stalled-cell .weight-val { color: var(--text3); }
.stalled-cell .weight-diff { opacity: 0.4; }
</style>
