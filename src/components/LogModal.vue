<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { CheckIcon, ChevronLeftIcon } from 'lucide-vue-next'
import { useWorkoutStore } from '../stores/workout'
import { usePlansStore } from '../stores/plans'
import { dbService } from '../services/localDb'
import { haptic } from '../services/haptics'
import { startRestTimer, dismissRestTimer } from '../services/restTimer'

const props = defineProps<{
  isOpen: boolean
  data: any
}>()

const emit = defineEmits(['close', 'logged'])
const store = useWorkoutStore()
const plansStore = usePlansStore()

const weightUnit = ref('kg')
const mSets = ref(1)
const mReps = ref(0)
const mWeight = ref(0)
const mRpe = ref(7)
const mNotes = ref('')

const mDuration = ref(15)
const mIncline = ref(0)
const mSpeed = ref(0)
const mHr = ref(0)
const mDurationSec = ref(0)

const mPyrW = ref<number[]>([])
const mPyrR = ref<number[]>([])

const doneSets = ref(0)
const showsSetTracker = computed(() => props.data?.exType !== 'cardio' && !props.data?.pyramid_reps)
const exerciseHistory = computed(() => {
  if (!props.isOpen || !props.data?.name || props.data?.exType === 'cardio') return []
  return store.getExerciseHistory(props.data.name, 3)
})

interface SetRecord { setNumber: number; weight: number; reps: number; rpe: number; durationSec: number | null }
const setRecords = ref<SetRecord[]>([])

watch(() => props.isOpen, (newVal) => {
  if (newVal && props.data) {
    doneSets.value = 0
    setRecords.value = []
    initModalData()
  }
})

watch(mSets, (val) => {
  if (doneSets.value > val) doneSets.value = val
})

function markSetDone() {
  if (doneSets.value >= mSets.value) return
  doneSets.value++
  setRecords.value.push({
    setNumber: doneSets.value,
    weight: getWeightKg(),
    reps: mReps.value,
    rpe: mRpe.value,
    durationSec: props.data?.exType === 'isometric' ? mDurationSec.value : null
  })
  haptic('success')
  const d = props.data
  if (d?.restSec > 0 && doneSets.value < mSets.value) {
    startRestTimer(d.restSec, d.name)
  }
}

function undoSet(n: number) {
  if (n > doneSets.value) return
  haptic('light')
  doneSets.value = n - 1
  setRecords.value = setRecords.value.slice(0, n - 1)
  dismissRestTimer()
}

function initModalData() {
  const d = props.data
  const info = store.getWeekInfo(store.currentWeek)
  weightUnit.value = 'kg'
  
  if (d.exType === 'cardio') {
    mDuration.value = d.duration_min || 15
    mIncline.value = d.incline_pct || 0
    mSpeed.value = d.speed_kmh || 0
    mHr.value = d.target_hr || 0
  } else {
    mSets.value = d.sets || 1
    mReps.value = d.reps || 0
    mDurationSec.value = d.duration_sec || 0
    mWeight.value = d.preWeight || 0
    mRpe.value = info.rpe_target || 7
    
    if (d.pyramid_reps) {
      mPyrW.value = d.pyramid_reps.map((_:any, i:number) => d.pyramid_weights?.[i] || 0)
      mPyrR.value = [...d.pyramid_reps]
    }
  }

  const prev = store.getPrevLog(d.dayLabel, d.name)
  if (prev) {
    if (d.exType === 'isometric') {
      mSets.value = prev[0] || d.sets || 1
      mReps.value = prev[1] || d.reps || 0
      mWeight.value = prev[2] || d.preWeight || 0
      mRpe.value = prev[3] || info.rpe_target || 7
      const prevNotes = prev[4] || ''
      const durMatch = prevNotes.match(/duration_sec:(\d+)/)
      if (durMatch) {
        mDurationSec.value = parseInt(durMatch[1])
      } else {
        mDurationSec.value = d.duration_sec || 0
      }
      mNotes.value = prevNotes.replace(/duration_sec:\d+\s?/, '').trim()
    } else if (!d.exType || d.exType !== 'cardio') {
      mSets.value = prev[0] || d.sets || 1
      mReps.value = prev[1] || d.reps || 0
      mWeight.value = prev[2] || d.preWeight || 0
      mRpe.value = prev[3] || info.rpe_target || 7
      mNotes.value = prev[4] || ''
    } else {
      mDuration.value = prev[1] || d.duration_min || 15
      mSpeed.value = prev[2] || d.speed_kmh || 0
      mHr.value = prev[3] || d.target_hr || 0
      
      const prevNotes = prev[4] || ''
      const inclineMatch = prevNotes.match(/incline:([\d.]+)%/)
      if (inclineMatch) {
        mIncline.value = parseFloat(inclineMatch[1])
      } else {
        mIncline.value = d.incline_pct || 0
      }
      
      mNotes.value = prevNotes.replace(/incline:[^\s]+ speed:[^\s]+ hr:[^\s]+\s?/,'')
    }
  } else {
    mNotes.value = ''
  }
}

function setWeightUnit(unit: string) {
  if (unit === weightUnit.value) return
  haptic('light')
  if (unit === 'lbs' && mWeight.value > 0) {
    mWeight.value = Math.round(mWeight.value * 2.2046 * 4) / 4
  } else if (unit === 'kg' && mWeight.value > 0) {
    mWeight.value = Math.round(mWeight.value / 2.2046 * 4) / 4
  }
  weightUnit.value = unit
}

function adjustWeight(delta: number) {
  haptic('light')
  const step = weightUnit.value === 'kg' ? 2.5 : 5
  mWeight.value = Math.max(0, Math.round((mWeight.value + delta * step) * 4) / 4)
}

function getWeightKg() {
  if (weightUnit.value === 'lbs') return Math.round(mWeight.value / 2.2046 * 100) / 100
  return mWeight.value
}

function saveLog() {
  const d = props.data
  const isCardio = d.exType === 'cardio'
  const planId = plansStore.activePlan?.id
  
  if (isCardio) {
    const cardioNotes = `incline:${mIncline.value}% speed:${mSpeed.value}km/h hr:${mHr.value}bpm${mNotes.value?' '+mNotes.value:''}`
    const existing = dbService.q(
      "SELECT id FROM workout_log WHERE week=? AND day_label=? AND exercise=? ORDER BY id DESC LIMIT 1",
      [store.currentWeek, d.dayLabel, d.name]
    )
    if (existing.length && existing[0].values.length) {
      dbService.run(`UPDATE workout_log SET reps=?,weight_kg=?,rpe=?,notes=?,synced=0 WHERE id=?`,
        [mDuration.value, mSpeed.value, mHr.value, cardioNotes, existing[0].values[0][0]])
    } else {
      const syncId = crypto.randomUUID()
      dbService.run(`INSERT INTO workout_log (sync_id,week,day_label,exercise,sets,reps,weight_kg,rpe,notes,synced,plan_id) VALUES (?,?,?,?,?,?,?,?,?,0,?)`,
        [syncId, store.currentWeek, d.dayLabel, d.name, 1, mDuration.value, mSpeed.value, mHr.value, cardioNotes, planId])
    }
  } else if (d.pyramid_reps) {
    for (let i = 0; i < d.pyramid_reps.length; i++) {
      const w = mPyrW.value[i] || 0
      const r = mPyrR.value[i] || 0
      if (w > d.safetyLimit && d.safetyLimit > 0) {
        haptic('warning')
        if (!confirm(`⚠ Serie ${i+1}: ${w}kg supera límite de ${d.safetyLimit}kg. ¿Continuar?`)) return
      }
      const syncId = crypto.randomUUID()
      dbService.run(`INSERT INTO workout_log (sync_id,week,day_label,exercise,sets,reps,weight_kg,rpe,notes,synced,plan_id) VALUES (?,?,?,?,?,?,?,?,?,0,?)`,
        [syncId, store.currentWeek, d.dayLabel, d.name+'_s'+(i+1), 1, r, w, mRpe.value, mNotes.value, planId])
    }
  } else {
    const isIsometric = d.exType === 'isometric'
    const weight = getWeightKg()
    if (!isIsometric && d.safetyLimit > 0 && weight > d.safetyLimit) {
      haptic('warning')
      if (!confirm(`⚠ ${weight}kg supera el límite de seguridad de ${d.safetyLimit}kg. ¿Continuar?`)) return
    }
    const logNotes = isIsometric
      ? `duration_sec:${mDurationSec.value}${mNotes.value ? ' ' + mNotes.value : ''}`
      : mNotes.value
    const existing = dbService.q(
      "SELECT id, sync_id FROM workout_log WHERE week=? AND day_label=? AND exercise=? ORDER BY id DESC LIMIT 1",
      [store.currentWeek, d.dayLabel, d.name]
    )
    let logSyncId: string
    if (existing.length && existing[0].values.length) {
      logSyncId = existing[0].values[0][1]
      dbService.run(`UPDATE workout_log SET sets=?,reps=?,weight_kg=?,rpe=?,notes=?,synced=0 WHERE id=?`,
        [mSets.value, mReps.value, weight, mRpe.value, logNotes, existing[0].values[0][0]])
    } else {
      logSyncId = crypto.randomUUID()
      dbService.run(`INSERT INTO workout_log (sync_id,week,day_label,exercise,sets,reps,weight_kg,rpe,notes,synced,plan_id) VALUES (?,?,?,?,?,?,?,?,?,0,?)`,
        [logSyncId, store.currentWeek, d.dayLabel, d.name, mSets.value, mReps.value, weight, mRpe.value, logNotes, planId])
    }
    dbService.saveLogSets(logSyncId, setRecords.value)
  }

  store.loggedThisSession.add(d.logId)
  store.dbUpdateTrigger++
  haptic('success')
  emit('logged')
  emit('close')
}

function formatRest(sec: number) {
  if (!sec) return null
  return sec >= 60 ? `${Math.floor(sec/60)}min ${sec%60>0?sec%60+'s':''}`.trim() : `${sec}s`
}
</script>

<template>
  <div v-if="isOpen" class="log-page">
    <div class="log-header">
      <button type="button" class="log-back" @click="emit('close')"><ChevronLeftIcon /></button>
      <div class="log-header-text">
        <div class="log-title">{{ data?.name }}</div>
        <div class="log-sub">
          <span v-if="data?.exType === 'cardio'">{{ data?.duration_min }} min · {{ data?.incline_pct }}% · {{ data?.speed_kmh }} km/h</span>
          <span v-else>{{ data?.sets }} series · RPE meta: {{ store.getWeekInfo(store.currentWeek).rpe_target || '?' }}</span>
        </div>
      </div>
    </div>

    <div class="log-body">
      <div v-if="exerciseHistory.length > 0" class="history-card">
        <div class="history-title">Historial reciente</div>
        <div v-for="h in exerciseHistory" :key="h.week" class="history-row">
          <span class="history-week">Sem {{ h.week }}</span>
          <span v-if="h.setDetails.length > 0" class="history-detail">
            <span v-for="(s, i) in h.setDetails" :key="Number(i)" class="history-set" :class="{ drop: Number(i) > 0 && Number(s.weight) < Number(h.setDetails[Number(i)-1].weight) }">
              {{ s.weight }}<span v-if="Number(i) < h.setDetails.length - 1"> · </span>
            </span>
            <span class="history-unit">kg</span>
          </span>
          <span v-else class="history-detail">{{ h.sets }}×{{ h.reps }} · {{ h.weightKg }}kg</span>
        </div>
      </div>

      <div v-if="data?.exType !== 'cardio'">
        <div class="input-row">
          <div class="input-group"><label>Series realizadas</label><input type="number" v-model="mSets" min="1" max="10"></div>
          <div v-if="data?.exType === 'isometric'" class="input-group"><label>Repeticiones</label><input type="number" v-model="mReps" min="0" max="50"></div>
          <div v-else class="input-group"><label>Repeticiones</label><input type="number" v-model="mReps" min="1" max="50"></div>
          <div class="input-group input-group-narrow"><label>RPE</label><input type="number" v-model="mRpe" min="1" max="10" step="0.5"></div>
        </div>
        <div v-if="data?.exType === 'isometric'" class="input-row">
          <div class="input-group"><label>Segundos (hold)</label><input type="number" v-model="mDurationSec" min="1" max="300"></div>
        </div>

        <div class="input-row">
          <div class="input-group">
            <label>Peso</label>
            <div style="display:flex;gap:8px;align-items:stretch">
              <div class="weight-stepper">
                <button type="button" class="stepper-btn" @click="adjustWeight(-1)">−</button>
                <input type="number" v-model="mWeight" min="0" :step="weightUnit === 'kg' ? 0.5 : 0.25">
                <button type="button" class="stepper-btn" @click="adjustWeight(1)">+</button>
              </div>
              <div class="unit-toggle">
                <button class="unit-btn" :class="{active: weightUnit === 'kg'}" @click="setWeightUnit('kg')">kg</button>
                <button class="unit-btn" :class="{active: weightUnit === 'lbs'}" @click="setWeightUnit('lbs')">lbs</button>
              </div>
            </div>
            <div v-if="weightUnit === 'lbs'" style="font-size:11px;color:var(--text3);margin-top:4px">= {{ Math.round(mWeight / 2.2046 * 100) / 100 }} kg guardado</div>
            <div v-if="weightUnit === 'kg' && mWeight > 0" style="font-size:11px;color:var(--text3);margin-top:4px">= {{ Math.round(mWeight * 2.2046 * 10) / 10 }} lbs</div>
            <div style="font-size:10px;color:var(--text3);margin-top:3px">📌 Registra el peso <b>por mancuerna</b></div>
          </div>
        </div>

        <div v-if="showsSetTracker" class="set-tracker">
          <div class="set-tracker-head">
            <span class="set-tracker-label">
              {{ doneSets >= mSets ? '¡Series completadas!' : `Serie ${doneSets + 1} de ${mSets}` }}
            </span>
          </div>
          <div class="set-dots">
            <button
              v-for="n in mSets"
              :key="n"
              type="button"
              class="set-dot"
              :class="{ done: n <= doneSets, next: n === doneSets + 1 }"
              @click="n <= doneSets ? undoSet(n) : (n === doneSets + 1 && markSetDone())"
            >
              <CheckIcon v-if="n <= doneSets" />
              <span v-else>{{ n }}</span>
            </button>
          </div>
          <div v-if="doneSets > 0" class="set-undo-hint">Toca una serie marcada para deshacerla</div>
          <button v-if="doneSets < mSets" type="button" class="btn btn-set-done" @click="markSetDone">
            {{ doneSets + 1 < mSets ? `✓ Serie ${doneSets + 1} hecha — iniciar descanso` : `✓ Marcar última serie` }}
          </button>
          <div v-else class="set-tracker-done-hint">Toca "Registrar" para guardar el ejercicio</div>
        </div>

        <div v-if="data?.pyramid_reps" style="margin-bottom:12px">
          <div style="font-size:12px;color:var(--text2);font-weight:600;margin-bottom:6px">Series piramidales</div>
          <div v-for="(_, i) in data.pyramid_reps" :key="i" class="input-row" style="margin-bottom:6px">
            <div class="input-group"><label>Serie {{Number(i)+1}} kg</label><input type="number" v-model="mPyrW[Number(i)]" min="0" step="2.5"></div>
            <div class="input-group"><label>Reps</label><input type="number" v-model="mPyrR[Number(i)]" min="1"></div>
          </div>
        </div>
      </div>

      <div v-else>
        <div class="input-row">
          <div class="input-group"><label>Duración (min)</label><input type="number" v-model="mDuration" min="1" max="120"></div>
          <div class="input-group"><label>Inclinación (%)</label><input type="number" v-model="mIncline" min="0" max="30" step="0.5"></div>
        </div>
        <div class="input-row">
          <div class="input-group"><label>Velocidad (km/h)</label><input type="number" v-model="mSpeed" min="0" max="30" step="0.1"></div>
          <div class="input-group"><label>FC real (bpm)</label><input type="number" v-model="mHr" min="0" max="220"></div>
        </div>
      </div>

      <div v-if="data?.safetyLimit > 0" style="font-size:12px;color:var(--amber);background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);border-radius:8px;padding:8px 12px;margin-bottom:12px">
        ⚠ Límite de seguridad: {{ data.safetyLimit }} kg
      </div>

      <div class="input-group" style="margin-bottom:20px">
        <label>Notas (opcional)</label>
        <input type="text" v-model="mNotes" placeholder="Ej: bajé el peso, buena forma...">
      </div>

      <div v-if="data?.restSec > 0" class="modal-rest">
        ⏱ Descanso recomendado: {{ formatRest(data.restSec) }}
      </div>
    </div>

    <div class="log-footer">
      <button class="btn btn-primary" @click="saveLog">✓ Registrar</button>
      <button class="btn btn-secondary" style="margin:0" @click="emit('close')">Cancelar</button>
    </div>
  </div>
</template>

<style scoped>
.log-page {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  animation: slide-up .28s cubic-bezier(.32,.72,0,1);
}
@keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }

.log-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top, 0px));
  border-bottom: 0.5px solid var(--border);
  background: var(--bg);
}
.log-back {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--bg3);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform .1s;
}
.log-back:active { transform: scale(0.9); }
.log-back :deep(svg) { width: 20px; height: 20px; }
.log-header-text { min-width: 0; flex: 1; }
.log-title { font-size: 17px; font-weight: 700; text-transform: capitalize; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.log-sub { font-size: 12px; color: var(--text2); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.log-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.log-footer {
  flex-shrink: 0;
  padding: 12px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  border-top: 0.5px solid var(--border);
  background: var(--bg);
}

.history-card { background: var(--bg3); border-radius: var(--r2); padding: 12px 14px; margin-bottom: 16px; }
.history-title { font-size: 11px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: .4px; margin-bottom: 8px; }
.history-row { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 0; font-size: 13px; }
.history-week { color: var(--text2); font-weight: 600; flex-shrink: 0; }
.history-detail { color: var(--text); font-weight: 600; text-align: right; }
.history-set.drop { color: var(--amber); }
.history-unit { color: var(--text3); font-weight: 500; margin-left: 2px; }
.input-row { display: flex; gap: 10px; margin-bottom: 12px; }
.input-group { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.input-group-narrow { flex: 0 0 64px; }
.input-group label { font-size: 12px; color: var(--text2); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
input[type=number], input[type=text] { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r3); color: var(--text); font-size: 16px; padding: 12px; width: 100%; }
input:focus { outline: none; border-color: var(--accent); }
.weight-stepper { display: flex; align-items: stretch; flex: 1; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r3); overflow: hidden; }
.weight-stepper input { flex: 1; width: auto; border: none; border-radius: 0; text-align: center; padding: 12px 4px; min-width: 0; background: transparent; }
.weight-stepper input:focus { outline: none; }
.stepper-btn { flex-shrink: 0; width: 40px; border: none; background: transparent; color: var(--accent2); font-size: 20px; font-weight: 600; cursor: pointer; line-height: 1; transition: background .15s, transform .1s; }
.stepper-btn:active { background: var(--bg4); transform: scale(0.9); }
.modal-rest { font-size: 12px; color: var(--text2); background: var(--bg3); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; text-align: center; }
.set-tracker { background: var(--bg3); border-radius: var(--r2); padding: 14px; margin-bottom: 16px; }
.set-tracker-head { text-align: center; margin-bottom: 10px; }
.set-tracker-label { font-size: 13px; font-weight: 700; color: var(--text); }
.set-dots { display: flex; justify-content: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.set-dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--bg4);
  color: var(--text2);
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  transition: transform .15s, background .2s, color .2s;
}
.set-dot :deep(svg) { width: 18px; height: 18px; }
.set-dot.done { background: var(--green); color: #fff; cursor: pointer; }
.set-dot.done:active { transform: scale(0.88); }
.set-dot.next { background: var(--accent); color: #fff; cursor: pointer; box-shadow: 0 0 0 4px rgba(108,99,255,.25); }
.set-dot.next:active { transform: scale(0.88); }
.set-undo-hint { text-align: center; font-size: 11px; color: var(--text3); margin-bottom: 10px; }
.btn-set-done { background: var(--accent); color: var(--accent-text); margin-bottom: 0; }
.set-tracker-done-hint { text-align: center; font-size: 12px; color: var(--green); font-weight: 600; }
.unit-toggle { display: flex; border: 1px solid var(--border2); border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.unit-btn { padding: 0 12px; height: 100%; border: none; background: transparent; color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s; }
.unit-btn.active { background: var(--accent); color: #fff; }
.btn { display: block; width: 100%; padding: 14px; border-radius: var(--r2); border: none; font-size: 15px; font-weight: 600; cursor: pointer; transition: transform .1s, opacity .2s; text-align: center; margin-bottom: 10px; }
.btn:active { transform: scale(0.97); }
.btn-primary { background: var(--accent); color: var(--accent-text); }
.btn-secondary { background: var(--bg2); color: var(--text); border: 1px solid var(--border2); }
</style>
