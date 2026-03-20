<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dbService } from '../services/localDb'

const stats = ref({
  total: 0,
  weeks: 0,
  maxKg: '—',
  avgRpe: '—'
})

const recentLogs = ref<any[]>([])

onMounted(() => {
  const total = dbService.q("SELECT COALESCE(SUM(sets),0) FROM workout_log")
  const weeks = dbService.q("SELECT COUNT(DISTINCT week) FROM workout_log")
  const maxKg = dbService.q("SELECT MAX(weight_kg) FROM workout_log WHERE exercise LIKE '%squat%'")
  const avgRpe = dbService.q("SELECT ROUND(AVG(rpe),1) FROM workout_log WHERE rpe > 0")
  
  const val = (r: any) => r.length && r[0].values.length ? r[0].values[0][0] : null
  
  stats.value.total = val(total) || 0
  stats.value.weeks = val(weeks) || 0
  stats.value.maxKg = val(maxKg) ? val(maxKg) + 'kg' : '—'
  stats.value.avgRpe = val(avgRpe) || '—'

  const recent = dbService.q(`SELECT exercise,sets,reps,weight_kg,rpe,logged_at FROM workout_log ORDER BY id DESC LIMIT 15`)
  if (recent.length && recent[0].values.length) {
    recentLogs.value = recent[0].values.map((r: any) => ({
      exercise: r[0], sets: r[1], reps: r[2], weight_kg: r[3], rpe: r[4], logged_at: r[5]
    }))
  }
})
</script>

<template>
  <div class="pb-6">
    <div style="padding:calc(24px + env(safe-area-inset-top,0px)) 20px 10px">
      <div style="font-size:12px;color:var(--text2);font-weight:600;letter-spacing:.5px">ESTADÍSTICAS</div>
      <div style="font-size:28px;font-weight:800;letter-spacing:-.5px;margin-top:4px">Tu Progreso</div>
    </div>
    
    <div class="stat-row" style="margin-top:12px">
      <div class="stat-box"><div class="stat-val">{{ stats.total }}</div><div class="stat-lbl">Sets totales</div></div>
      <div class="stat-box"><div class="stat-val">{{ stats.weeks }}</div><div class="stat-lbl">Semanas activas</div></div>
    </div>
    <div class="stat-row">
      <div class="stat-box"><div class="stat-val">{{ stats.maxKg }}</div><div class="stat-lbl">Max squat kg</div></div>
      <div class="stat-box"><div class="stat-val">{{ stats.avgRpe }}</div><div class="stat-lbl">RPE promedio</div></div>
    </div>

    <div class="card mt-4 mx-4">
      <div class="card-title">Historial reciente</div>
      <div>
        <div v-if="recentLogs.length === 0" class="empty">Sin registros aún.</div>
        <div v-for="(log, idx) in recentLogs" :key="idx" class="log-item">
          <div class="log-dot"></div>
          <div class="log-info">
            <div class="log-name">{{ log.exercise }}</div>
            <div class="log-meta">{{ log.sets }}×{{ log.reps }} · {{ log.weight_kg }}kg · RPE {{ log.rpe }}</div>
          </div>
          <div class="log-val">{{ (log.logged_at||'').slice(5,16) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-row { display: flex; gap: 10px; padding: 0 16px 10px; }
.stat-box { flex: 1; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r2); padding: 14px 12px; text-align: center; }
.stat-val { font-size: 24px; font-weight: 700; color: var(--accent2); }
.stat-lbl { font-size: 11px; color: var(--text2); margin-top: 2px; }
.card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; }
.card-title { font-size: 13px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 12px; }
.empty { color: var(--text2); font-size: 13px; padding: 8px 0; }
.log-item { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border); gap: 12px; }
.log-item:last-child { border-bottom: none; padding-bottom: 0; }
.log-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
.log-info { flex: 1; min-width: 0; }
.log-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.log-meta { font-size: 12px; color: var(--text2); margin-top: 1px; }
.log-val { font-size: 12px; font-weight: 600; color: var(--accent2); flex-shrink: 0; }
</style>
