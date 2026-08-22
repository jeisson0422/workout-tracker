<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ChevronRightIcon, XIcon } from 'lucide-vue-next'
import { dbService } from '../services/localDb'
import { usePlansStore } from '../stores/plans'
import { useWorkoutStore } from '../stores/workout'
import { useUserStore } from '../stores/user'

const plansStore = usePlansStore()
const workoutStore = useWorkoutStore()
const userStore = useUserStore()
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
const weeklyVolume = ref<{ week: number; vol: number }[]>([])
const maxVolume = ref(1)
const rpeWeekly = ref<{ week: number; actual: number; target: number | null; status: 'ok' | 'low' | 'high' }[]>([])
const repsCompliance = ref<{ exercise: string; avgReps: number; target: number }[]>([])
const heatmapWeeks = ref<{ label: string; days: { date: string; count: number; future: boolean } [] }[]>([])
const exerciseMeta = ref<Map<string, { reps: number; exercise_type: string; group_type: string }>>(new Map())
const progressionMatrix = ref<{ weeks: number[]; rows: { exercise: string; weights: Record<number, number | null> }[] }>({ weeks: [], rows: [] })
const maxDays = ref(1)

function loadExerciseMeta() {
  const pid = planId.value
  exerciseMeta.value = new Map()
  if (!pid) return
  const r = dbService.q(`
    SELECT pe.exercise_name, pe.reps, pe.exercise_type, pe.group_type
    FROM plan_exercises pe
    JOIN training_days td ON pe.training_day_id = td.id
    WHERE td.plan_id = ? AND pe.deleted = 0 AND td.deleted = 0
  `, [pid])
  if (r.length && r[0].values) {
    for (const row of r[0].values as any[]) {
      exerciseMeta.value.set(row[0], { reps: Number(row[1]) || 0, exercise_type: row[2] || 'strength', group_type: row[3] || '' })
    }
  }
}

function loadStats() {
  const pid = planId.value
  if (!pid) return

  loadExerciseMeta()

  const getVal = (sql: string, params: any[] = []) => {
    const r = dbService.q(sql, params)
    return r.length && r[0].values.length ? r[0].values[0][0] : 0
  }

  kpis.value.workouts = getVal("SELECT COUNT(*) FROM workout_log WHERE exercise = '_day_complete' AND plan_id = ?", [pid]) || 0
  kpis.value.totalVolume = getVal(`
    SELECT SUM(
      COALESCE(
        (SELECT SUM(s.weight_kg * s.reps) FROM workout_log_sets s WHERE s.log_sync_id = wl.sync_id AND s.deleted = 0),
        wl.sets * wl.reps * wl.weight_kg
      )
    )
    FROM workout_log wl
    WHERE wl.exercise != '_day_complete' AND wl.weight_kg > 0 AND wl.plan_id = ?
  `, [pid]) || 0
  kpis.value.activeWeeks = getVal("SELECT COUNT(DISTINCT week) FROM workout_log WHERE plan_id = ?", [pid]) || 0
  kpis.value.avgRpe = getVal("SELECT ROUND(AVG(rpe),1) FROM workout_log WHERE rpe > 0 AND exercise != '_day_complete' AND plan_id = ?", [pid]) || 0

  const prs = dbService.q(`
    SELECT exercise, MAX(best_kg), ROUND(MAX(best_1rm), 1)
    FROM (
      SELECT wl.exercise as exercise,
        COALESCE((SELECT MAX(s.weight_kg) FROM workout_log_sets s WHERE s.log_sync_id = wl.sync_id AND s.deleted = 0), wl.weight_kg) as best_kg,
        COALESCE(
          (SELECT MAX(s.weight_kg * (1.0 + s.reps / 30.0)) FROM workout_log_sets s WHERE s.log_sync_id = wl.sync_id AND s.deleted = 0 AND s.reps > 0),
          wl.weight_kg * (1.0 + wl.reps / 30.0)
        ) as best_1rm
      FROM workout_log wl
      WHERE wl.exercise != '_day_complete' AND wl.weight_kg > 0 AND wl.plan_id = ?
    )
    GROUP BY exercise
    ORDER BY best_kg DESC
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

  loadWeeklyVolume()
  loadRpeWeekly()
  loadRepsCompliance()
  loadHeatmap()
  loadProgression()
}

function loadWeeklyVolume() {
  const pid = planId.value
  if (!pid) { weeklyVolume.value = []; return }
  const r = dbService.q(`
    SELECT wl.week, SUM(
      COALESCE(
        (SELECT SUM(s.weight_kg * s.reps) FROM workout_log_sets s WHERE s.log_sync_id = wl.sync_id AND s.deleted = 0),
        wl.sets * wl.reps * wl.weight_kg
      )
    ) as vol
    FROM workout_log wl
    WHERE wl.exercise != '_day_complete' AND wl.plan_id = ?
    GROUP BY wl.week
    ORDER BY wl.week DESC
    LIMIT 8
  `, [pid])
  if (!r.length || !r[0].values) { weeklyVolume.value = []; maxVolume.value = 1; return }
  weeklyVolume.value = (r[0].values as any[]).map(row => ({ week: Number(row[0]), vol: Number(row[1]) || 0 })).reverse()
  maxVolume.value = Math.max(1, ...weeklyVolume.value.map(v => v.vol))
}

function loadRpeWeekly() {
  const pid = planId.value
  if (!pid) { rpeWeekly.value = []; return }
  const r = dbService.q(`
    SELECT week, ROUND(AVG(rpe), 1)
    FROM workout_log
    WHERE rpe > 0 AND exercise != '_day_complete' AND plan_id = ?
    GROUP BY week
    ORDER BY week DESC
    LIMIT 8
  `, [pid])
  if (!r.length || !r[0].values) { rpeWeekly.value = []; return }
  const rows = (r[0].values as any[]).map(row => {
    const week = Number(row[0])
    const actual = Number(row[1])
    const target = workoutStore.getWeekInfo(week)?.rpe_target ?? null
    let status: 'ok' | 'low' | 'high' = 'ok'
    if (target != null) {
      const diff = actual - Number(target)
      if (diff <= -1.5) status = 'low'
      else if (diff >= 1) status = 'high'
    }
    return { week, actual, target: target != null ? Number(target) : null, status }
  })
  rpeWeekly.value = rows.reverse()
}

function loadRepsCompliance() {
  const pid = planId.value
  repsCompliance.value = []
  if (!pid) return

  const lastWeekRes = dbService.q("SELECT exercise, MAX(week) FROM workout_log WHERE exercise != '_day_complete' AND plan_id = ? GROUP BY exercise", [pid])
  const lastWeekMap = new Map<string, number>()
  if (lastWeekRes.length && lastWeekRes[0].values) {
    for (const row of lastWeekRes[0].values as any[]) lastWeekMap.set(row[0], Number(row[1]))
  }

  const logRes = dbService.q("SELECT exercise, week, sync_id, reps FROM workout_log WHERE exercise != '_day_complete' AND plan_id = ?", [pid])
  const setAvgRes = dbService.q("SELECT log_sync_id, AVG(reps) FROM workout_log_sets WHERE deleted = 0 GROUP BY log_sync_id")
  const setAvgMap = new Map<string, number>()
  if (setAvgRes.length && setAvgRes[0].values) {
    for (const row of setAvgRes[0].values as any[]) setAvgMap.set(row[0], Number(row[1]))
  }

  const repsAcc = new Map<string, { sum: number; count: number }>()
  if (logRes.length && logRes[0].values) {
    for (const row of logRes[0].values as any[]) {
      const [exercise, week, syncId, reps] = row
      if (lastWeekMap.get(exercise) !== Number(week)) continue
      const repsVal = syncId && setAvgMap.has(syncId) ? setAvgMap.get(syncId)! : Number(reps)
      const acc = repsAcc.get(exercise) || { sum: 0, count: 0 }
      acc.sum += repsVal
      acc.count += 1
      repsAcc.set(exercise, acc)
    }
  }

  const result: { exercise: string; avgReps: number; target: number }[] = []
  for (const [exercise, acc] of repsAcc.entries()) {
    const meta = exerciseMeta.value.get(exercise)
    if (!meta || meta.reps <= 0) continue
    if (meta.exercise_type !== 'strength' && meta.exercise_type !== 'isometric') continue
    const avgReps = acc.sum / acc.count
    if (avgReps <= meta.reps - 1) {
      result.push({ exercise, avgReps: Math.round(avgReps * 10) / 10, target: meta.reps })
    }
  }
  repsCompliance.value = result.sort((a, b) => (a.avgReps - a.target) - (b.avgReps - b.target))
}

function loadHeatmap() {
  const pid = planId.value
  heatmapWeeks.value = []
  if (!pid) return
  const r = dbService.q(`
    SELECT substr(logged_at, 1, 10) as d, COUNT(DISTINCT day_label)
    FROM workout_log
    WHERE exercise = '_day_complete' AND plan_id = ?
    GROUP BY d
  `, [pid])
  const counts = new Map<string, number>()
  if (r.length && r[0].values) {
    for (const row of r[0].values as any[]) counts.set(row[0], Number(row[1]))
  }

  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)
  const dow = (today.getDay() + 6) % 7
  const thisMonday = new Date(today)
  thisMonday.setDate(today.getDate() - dow)

  const weeks = []
  for (let w = 9; w >= 0; w--) {
    const monday = new Date(thisMonday)
    monday.setDate(thisMonday.getDate() - w * 7)
    const days = []
    for (let d = 0; d < 7; d++) {
      const dt = new Date(monday)
      dt.setDate(monday.getDate() + d)
      const key = dt.toISOString().slice(0, 10)
      days.push({ date: key, count: counts.get(key) || 0, future: key > todayKey })
    }
    weeks.push({ label: `${monday.getDate()}/${monday.getMonth() + 1}`, days })
  }
  heatmapWeeks.value = weeks
}

const adherencePct = computed(() => {
  const days = userStore.profile.days_per_week || 0
  if (!days || weeklyConsistency.value.length === 0) return null
  const totalActual = weeklyConsistency.value.reduce((s, w) => s + w.days, 0)
  const totalExpected = weeklyConsistency.value.length * days
  if (totalExpected === 0) return null
  return Math.round((totalActual / totalExpected) * 100)
})

function loadProgression() {
  const pid = planId.value
  if (!pid) return

  const dayFilter = selectedDay.value

  let sql: string
  let params: any[]

  if (dayFilter) {
    sql = `
      SELECT exercise, week, MAX(best_kg)
      FROM (
        SELECT wl.exercise as exercise, wl.week as week,
          COALESCE((SELECT MAX(s.weight_kg) FROM workout_log_sets s WHERE s.log_sync_id = wl.sync_id AND s.deleted = 0), wl.weight_kg) as best_kg
        FROM workout_log wl
        WHERE wl.exercise != '_day_complete' AND wl.weight_kg > 0 AND wl.plan_id = ? AND wl.day_label = ?
      )
      GROUP BY exercise, week
      ORDER BY exercise, week
    `
    params = [pid, dayFilter]
  } else {
    sql = `
      SELECT exercise, week, MAX(best_kg)
      FROM (
        SELECT wl.exercise as exercise, wl.week as week,
          COALESCE((SELECT MAX(s.weight_kg) FROM workout_log_sets s WHERE s.log_sync_id = wl.sync_id AND s.deleted = 0), wl.weight_kg) as best_kg
        FROM workout_log wl
        WHERE wl.exercise != '_day_complete' AND wl.weight_kg > 0 AND wl.plan_id = ?
      )
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

function formatVol(v: number): string {
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
  return String(Math.round(v))
}

function suggestedFor(row: { exercise: string; weights: Record<number, number | null> }): { kg: number; change: string } | null {
  const meta = exerciseMeta.value.get(row.exercise)
  if (meta && meta.exercise_type !== 'strength' && meta.exercise_type !== 'isometric') return null
  if (meta && meta.group_type === 'pyramid') return null

  const weeks = progressionMatrix.value.weeks
  let lastWeight: number | null = null
  for (let i = weeks.length - 1; i >= 0; i--) {
    const w = row.weights[weeks[i]]
    if (w != null) { lastWeight = w; break }
  }
  if (lastWeight == null) return null

  const nextWeek = plansStore.activePlan?.current_week
  if (nextWeek == null) return null
  const weekInfo = workoutStore.getWeekInfo(nextWeek)
  const pct = weekInfo?.weight_change_pct || '0%'
  if (pct === 'maintain' || pct === '0%') return { kg: lastWeight, change: '=' }

  const match = String(pct).match(/([+-]?[\d.]+)%/)
  if (!match) return { kg: lastWeight, change: '=' }

  const delta = parseFloat(match[1]) / 100
  const raw = lastWeight * (1 + delta)
  const rounded = Math.round(raw / 2.5) * 2.5
  const kg = rounded > lastWeight ? rounded : parseFloat(raw.toFixed(2))
  return { kg, change: pct }
}

const showDetail = ref(false)
const detailExercise = ref('')
const detailSessions = ref<{ week: number; reps: number; weightKg: number; rpe: number; loggedAt: string; sets: { n: number; weight: number; reps: number; rpe: number }[] }[]>([])

function openDetail(exercise: string) {
  const pid = planId.value
  if (!pid) return
  detailExercise.value = exercise

  const rows = dbService.q(`
    SELECT week, sync_id, reps, weight_kg, rpe, logged_at
    FROM workout_log
    WHERE exercise = ? AND plan_id = ? AND exercise != '_day_complete'
    ORDER BY week DESC, id DESC LIMIT 6
  `, [exercise, pid])

  const sessions: typeof detailSessions.value = []
  if (rows.length && rows[0].values) {
    for (const row of rows[0].values as any[]) {
      const [week, syncId, reps, weightKg, rpe, loggedAt] = row
      let sets: { n: number; weight: number; reps: number; rpe: number }[] = []
      if (syncId) {
        const setsRes = dbService.q(
          "SELECT set_number, weight_kg, reps, rpe FROM workout_log_sets WHERE log_sync_id = ? AND deleted = 0 ORDER BY set_number",
          [syncId]
        )
        if (setsRes.length && setsRes[0].values) {
          sets = (setsRes[0].values as any[]).map(s => ({ n: Number(s[0]), weight: Number(s[1]), reps: Number(s[2]), rpe: Number(s[3]) }))
        }
      }
      sessions.push({ week: Number(week), reps: Number(reps), weightKg: Number(weightKg), rpe: Number(rpe), loggedAt, sets })
    }
  }
  detailSessions.value = sessions
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
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
        <div class="card-title">Volumen Semanal (kg)</div>
        <div v-if="weeklyVolume.length === 0" class="empty">Registra series para ver tu volumen real.</div>
        <div v-else class="chart-container">
          <div v-for="item in weeklyVolume" :key="item.week" class="chart-bar-wrap">
            <div class="chart-bar" :style="{ height: `${Math.max((item.vol / maxVolume) * 100, 5)}%` }">
              <span class="bar-val" v-if="item.vol > 0">{{ formatVol(item.vol) }}</span>
            </div>
            <div class="chart-lbl">S{{ item.week }}</div>
          </div>
        </div>
      </div>

      <div class="card mt-4 mx-4">
        <div class="card-title-row">
          <div class="card-title">Consistencia</div>
          <div v-if="adherencePct !== null" class="adherence-badge" :class="{ low: adherencePct < 70 }">{{ adherencePct }}% cumplimiento</div>
        </div>
        <div v-if="heatmapWeeks.length === 0" class="empty">Registra días completos para ver tu progreso.</div>
        <div v-else class="heatmap-grid">
          <div v-for="week in heatmapWeeks" :key="week.label" class="heatmap-row">
            <span class="heatmap-lbl">{{ week.label }}</span>
            <div class="heatmap-cells">
              <div
                v-for="day in week.days"
                :key="day.date"
                class="heatmap-cell"
                :class="{ trained: day.count > 0, future: day.future }"
                :title="day.date"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card mt-4 mx-4" v-if="rpeWeekly.length > 0">
        <div class="card-title">RPE vs Objetivo</div>
        <div class="rpe-row" v-for="item in rpeWeekly" :key="item.week">
          <span class="rpe-week">S{{ item.week }}</span>
          <span class="rpe-values">{{ item.actual }} <span class="rpe-vs">/ meta {{ item.target ?? '?' }}</span></span>
          <span class="rpe-status" :class="item.status">
            <template v-if="item.status === 'low'">⬆ subí peso</template>
            <template v-else-if="item.status === 'high'">⚠ posible fatiga</template>
            <template v-else>✓ en rango</template>
          </span>
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
                <th>Próx.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in sortedRows" :key="row.exercise">
                <td class="ex-name" @click="openDetail(row.exercise)">
                  <span v-if="rowStallScore(row) >= 2" class="stall-icon" title="Estancado">⚠</span>
                  {{ row.exercise }}
                  <ChevronRightIcon class="ex-chevron" />
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
                <td class="weight-cell suggest-cell">
                  <template v-if="suggestedFor(row)">
                    <span class="suggest-val">{{ suggestedFor(row)!.kg }}</span>
                  </template>
                  <span v-else class="weight-empty">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card mt-4 mx-4" v-if="repsCompliance.length > 0">
        <div class="card-title">Cumplimiento de Reps</div>
        <div class="list-item" v-for="item in repsCompliance" :key="item.exercise">
          <div class="list-info">
            <div class="list-name">{{ item.exercise }}</div>
            <div class="list-meta">Objetivo: {{ item.target }} reps</div>
          </div>
          <div class="list-val reps-short">{{ item.avgReps }} reps</div>
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

    <div v-if="showDetail" class="detail-page">
      <div class="detail-header">
        <button type="button" class="detail-back" @click="closeDetail"><XIcon /></button>
        <div class="detail-header-text">
          <div class="detail-title">{{ detailExercise }}</div>
          <div class="detail-sub">Últimas sesiones · serie a serie</div>
        </div>
      </div>
      <div class="detail-body">
        <div v-if="detailSessions.length === 0" class="empty">Sin sesiones registradas.</div>
        <div v-for="s in detailSessions" :key="s.loggedAt + s.week" class="session-card">
          <div class="session-head">
            <span class="session-week">Semana {{ s.week }}</span>
            <span class="session-date">{{ s.loggedAt?.slice(0, 10) }}</span>
          </div>
          <div v-if="s.sets.length > 0" class="set-list">
            <div v-for="set in s.sets" :key="set.n" class="set-row">
              <span class="set-num">Serie {{ set.n }}</span>
              <span class="set-detail">{{ set.weight }}kg × {{ set.reps }}</span>
              <span class="set-rpe">RPE {{ set.rpe }}</span>
            </div>
          </div>
          <div v-else class="set-list">
            <div class="set-row">
              <span class="set-num">Agregado</span>
              <span class="set-detail">{{ s.weightKg }}kg × {{ s.reps }}</span>
              <span class="set-rpe">RPE {{ s.rpe }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 16px 10px; margin-top: 12px; }
.kpi-card { background: var(--bg2); border: 1px solid var(--card-border); box-shadow: var(--card-shadow); border-radius: var(--r2); padding: 14px 12px; text-align: center; }
.kpi-val { font-size: 24px; font-weight: 700; color: var(--accent2); line-height: 1.1; }
.kpi-lbl { font-size: 11px; color: var(--text2); margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

.card { background: var(--bg2); border: 1px solid var(--card-border); box-shadow: var(--card-shadow); border-radius: var(--r); padding: 16px; }
.card-title { font-size: 13px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 12px; }
.card-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 8px; }
.card-title-row .card-title { margin-bottom: 0; }
.empty { color: var(--text2); font-size: 13px; padding: 8px 0; text-align: center; }

.day-filter {
  background: var(--bg3); color: var(--text); border: 1px solid var(--border);
  border-radius: 999px; font-size: 12px; padding: 5px 10px; font-weight: 600;
  max-width: 160px; outline: none;
}

.adherence-badge {
  font-size: 11px; font-weight: 700; color: var(--green); background: rgba(34,197,94,.12);
  padding: 4px 10px; border-radius: 999px; white-space: nowrap;
}
.adherence-badge.low { color: var(--amber, #d97706); background: rgba(251,191,36,.12); }

.list-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 0.5px solid var(--border); gap: 12px; }
.list-item:last-child { border-bottom: none; padding-bottom: 0; }
.list-info { flex: 1; min-width: 0; }
.list-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: capitalize; }
.list-meta { font-size: 12px; color: var(--text2); margin-top: 2px; }
.list-val { font-size: 14px; font-weight: 700; color: var(--accent); flex-shrink: 0; }
.list-val.reps-short { color: var(--amber, #d97706); }

.chart-container { display: flex; align-items: flex-end; justify-content: space-between; height: 120px; padding-top: 20px; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 8px; }
.chart-bar-wrap { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; width: 100%; max-width: 32px; flex: 1; }
.chart-bar { width: 100%; max-width: 24px; background: var(--accent); border-radius: 4px 4px 0 0; position: relative; min-height: 4px; display: flex; justify-content: center; opacity: 0.9; transition: height 0.3s ease; }
.bar-val { position: absolute; top: -18px; font-size: 10px; font-weight: 600; color: var(--text); }
.chart-lbl { font-size: 10px; color: var(--text2); margin-top: 8px; font-weight: 600; }

.heatmap-grid { display: flex; flex-direction: column; gap: 4px; }
.heatmap-row { display: flex; align-items: center; gap: 8px; }
.heatmap-lbl { font-size: 10px; color: var(--text3); width: 34px; flex-shrink: 0; }
.heatmap-cells { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; flex: 1; }
.heatmap-cell { aspect-ratio: 1; border-radius: 3px; background: var(--bg3); }
.heatmap-cell.trained { background: var(--accent); }
.heatmap-cell.future { background: transparent; }

.rpe-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 0.5px solid var(--border); gap: 8px; font-size: 13px; }
.rpe-row:last-child { border-bottom: none; padding-bottom: 0; }
.rpe-week { font-weight: 600; width: 32px; flex-shrink: 0; }
.rpe-values { flex: 1; }
.rpe-vs { color: var(--text2); font-size: 11px; }
.rpe-status { font-size: 11px; font-weight: 600; white-space: nowrap; }
.rpe-status.ok { color: var(--green); }
.rpe-status.low { color: var(--accent2); }
.rpe-status.high { color: var(--red); }

.prog-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 0 -4px; }
.prog-table { width: 100%; border-collapse: collapse; font-size: 13px; white-space: nowrap; }
.prog-table th { color: var(--text2); font-weight: 600; font-size: 11px; padding: 6px 8px; border-bottom: 1px solid var(--border); text-align: center; }
.prog-table th:first-child { text-align: left; padding-left: 4px; }
.prog-table td { padding: 8px; border-bottom: 1px solid var(--border); text-align: center; }
.prog-table td:first-child { padding-left: 4px; }
.prog-table tbody tr:last-child td { border-bottom: none; }
.ex-name { text-align: left !important; max-width: 140px; overflow: hidden; text-overflow: ellipsis; font-weight: 500; cursor: pointer; position: relative; padding-right: 16px !important; }
.ex-chevron { width: 12px; height: 12px; color: var(--text3); position: absolute; right: 2px; top: 50%; transform: translateY(-50%); }

.weight-cell { position: relative; }
.weight-val { font-weight: 700; color: var(--text); }
.weight-diff { display: block; font-size: 10px; margin-top: 1px; }
.diff-up { color: var(--green); }
.diff-down { color: var(--red); }
.weight-empty { color: var(--text3); }
.suggest-cell { background: rgba(99,102,241,.06); border-radius: var(--r1); }
.suggest-val { font-weight: 700; color: var(--accent2); }

.stall-warning {
  background: rgba(251,191,36,.12); color: var(--amber, #d97706);
  font-size: 12px; font-weight: 600; padding: 8px 12px; border-radius: var(--r1);
  margin-bottom: 10px; text-align: center;
}
.stall-icon { margin-right: 3px; }
.stalled-cell .weight-val { color: var(--text3); }
.stalled-cell .weight-diff { opacity: 0.4; }

.detail-page {
  position: fixed; inset: 0; z-index: 200; background: var(--bg);
  display: flex; flex-direction: column; animation: slide-up .28s cubic-bezier(.32,.72,0,1);
}
@keyframes slide-up { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.detail-header {
  display: flex; align-items: center; gap: 12px; flex-shrink: 0;
  padding: 12px 16px; padding-top: calc(12px + env(safe-area-inset-top, 0px));
  border-bottom: 0.5px solid var(--border); background: var(--bg);
}
.detail-back {
  width: 36px; height: 36px; border-radius: 50%; border: none; background: var(--bg3);
  color: var(--text); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.detail-back:active { transform: scale(0.9); }
.detail-back :deep(svg) { width: 18px; height: 18px; }
.detail-header-text { min-width: 0; flex: 1; }
.detail-title { font-size: 17px; font-weight: 700; text-transform: capitalize; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.detail-sub { font-size: 12px; color: var(--text2); margin-top: 1px; }
.detail-body { flex: 1; overflow-y: auto; padding: 16px 20px; }

.session-card { background: var(--bg2); border: 1px solid var(--card-border); border-radius: var(--r2); padding: 12px; margin-bottom: 12px; }
.session-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.session-week { font-size: 13px; font-weight: 700; }
.session-date { font-size: 11px; color: var(--text3); }
.set-list { display: flex; flex-direction: column; gap: 6px; }
.set-row { display: flex; align-items: center; justify-content: space-between; font-size: 12px; }
.set-num { color: var(--text2); width: 56px; flex-shrink: 0; }
.set-detail { font-weight: 600; flex: 1; text-align: center; }
.set-rpe { color: var(--text2); width: 56px; text-align: right; flex-shrink: 0; }
</style>
