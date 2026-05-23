<script setup lang="ts">
import { ref, watch } from 'vue'
import { useWorkoutStore } from '../stores/workout'
import { usePlansStore } from '../stores/plans'
import { dbService } from '../services/localDb'

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

const mPyrW = ref<number[]>([])
const mPyrR = ref<number[]>([])

watch(() => props.isOpen, (newVal) => {
  if (newVal && props.data) {
    initModalData()
  }
})

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
    mWeight.value = d.preWeight || 0
    mRpe.value = info.rpe_target || 7
    
    if (d.pyramid_reps) {
      mPyrW.value = d.pyramid_reps.map((_:any, i:number) => d.pyramid_weights?.[i] || 0)
      mPyrR.value = [...d.pyramid_reps]
    }
  }

  const prev = store.getPrevLog(d.dayLabel, d.name)
  if (prev) {
    if (!d.exType || d.exType !== 'cardio') {
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
  if (unit === 'lbs' && mWeight.value > 0) {
    mWeight.value = Math.round(mWeight.value * 2.2046 * 4) / 4
  } else if (unit === 'kg' && mWeight.value > 0) {
    mWeight.value = Math.round(mWeight.value / 2.2046 * 4) / 4
  }
  weightUnit.value = unit
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
        if (!confirm(`⚠ Serie ${i+1}: ${w}kg supera límite de ${d.safetyLimit}kg. ¿Continuar?`)) return
      }
      const syncId = crypto.randomUUID()
      dbService.run(`INSERT INTO workout_log (sync_id,week,day_label,exercise,sets,reps,weight_kg,rpe,notes,synced,plan_id) VALUES (?,?,?,?,?,?,?,?,?,0,?)`,
        [syncId, store.currentWeek, d.dayLabel, d.name+'_s'+(i+1), 1, r, w, mRpe.value, mNotes.value, planId])
    }
  } else {
    const weight = getWeightKg()
    if (d.safetyLimit > 0 && weight > d.safetyLimit) {
      if (!confirm(`⚠ ${weight}kg supera el límite de seguridad de ${d.safetyLimit}kg. ¿Continuar?`)) return
    }
    const existing = dbService.q(
      "SELECT id FROM workout_log WHERE week=? AND day_label=? AND exercise=? ORDER BY id DESC LIMIT 1",
      [store.currentWeek, d.dayLabel, d.name]
    )
    if (existing.length && existing[0].values.length) {
      dbService.run(`UPDATE workout_log SET sets=?,reps=?,weight_kg=?,rpe=?,notes=?,synced=0 WHERE id=?`,
        [mSets.value, mReps.value, weight, mRpe.value, mNotes.value, existing[0].values[0][0]])
    } else {
      const syncId = crypto.randomUUID()
      dbService.run(`INSERT INTO workout_log (sync_id,week,day_label,exercise,sets,reps,weight_kg,rpe,notes,synced,plan_id) VALUES (?,?,?,?,?,?,?,?,?,0,?)`,
        [syncId, store.currentWeek, d.dayLabel, d.name, mSets.value, mReps.value, weight, mRpe.value, mNotes.value, planId])
    }
  }

  store.loggedThisSession.add(d.logId)
  store.dbUpdateTrigger++
  emit('logged')
  emit('close')
}

function formatRest(sec: number) {
  if (!sec) return null
  return sec >= 60 ? `${Math.floor(sec/60)}min ${sec%60>0?sec%60+'s':''}`.trim() : `${sec}s`
}
</script>

<template>
  <div v-if="isOpen" class="overlay open">
    <div class="modal" @click.stop>
      <div class="modal-title">{{ data?.name }}</div>
      <div class="modal-sub">
        <span v-if="data?.exType === 'cardio'">{{ data?.duration_min }} min · {{ data?.incline_pct }}% · {{ data?.speed_kmh }} km/h</span>
        <span v-else>{{ data?.sets }} series · RPE meta: {{ store.getWeekInfo(store.currentWeek).rpe_target || '?' }}</span>
      </div>

      <div v-if="data?.exType !== 'cardio'">
        <div class="input-row">
          <div class="input-group"><label>Series realizadas</label><input type="number" v-model="mSets" min="1" max="10"></div>
          <div class="input-group"><label>{{ data?.exType === 'isometric' ? 'Segundos' : 'Repeticiones' }}</label><input type="number" v-model="mReps" min="1" max="50"></div>
        </div>
        
        <div class="input-row">
          <div class="input-group">
            <label>Peso</label>
            <div style="display:flex;gap:8px;align-items:stretch">
              <input type="number" v-model="mWeight" min="0" :step="weightUnit === 'kg' ? 0.5 : 0.25" style="flex:1">
              <div class="unit-toggle">
                <button class="unit-btn" :class="{active: weightUnit === 'kg'}" @click="setWeightUnit('kg')">kg</button>
                <button class="unit-btn" :class="{active: weightUnit === 'lbs'}" @click="setWeightUnit('lbs')">lbs</button>
              </div>
            </div>
            <div v-if="weightUnit === 'lbs'" style="font-size:11px;color:var(--text3);margin-top:4px">= {{ Math.round(mWeight / 2.2046 * 100) / 100 }} kg guardado</div>
            <div v-if="weightUnit === 'kg' && mWeight > 0" style="font-size:11px;color:var(--text3);margin-top:4px">= {{ Math.round(mWeight * 2.2046 * 10) / 10 }} lbs</div>
            <div style="font-size:10px;color:var(--text3);margin-top:3px">📌 Registra el peso <b>por mancuerna</b></div>
          </div>
          <div class="input-group"><label>RPE (1–10)</label><input type="number" v-model="mRpe" min="1" max="10" step="0.5"></div>
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

      <button class="btn btn-primary" @click="saveLog">✓ Registrar</button>
      <button class="btn btn-secondary" style="margin:0" @click="emit('close')">Cancelar</button>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.75); z-index: 200; display: flex; align-items: flex-end; backdrop-filter: blur(4px); }
.modal { background: var(--bg2); border-radius: 20px 20px 0 0; padding: 24px 20px; width: 100%; max-width: 430px; margin: 0 auto; max-height: 80vh; overflow-y: auto; padding-bottom: calc(24px + env(safe-area-inset-bottom,0px)); }
.modal-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; text-transform: capitalize; }
.modal-sub { font-size: 13px; color: var(--text2); margin-bottom: 20px; }
.input-row { display: flex; gap: 10px; margin-bottom: 12px; }
.input-group { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.input-group label { font-size: 12px; color: var(--text2); font-weight: 500; }
input[type=number], input[type=text] { background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 16px; padding: 12px; width: 100%; }
input:focus { outline: none; border-color: var(--accent); }
.modal-rest { font-size: 12px; color: var(--text2); background: var(--bg3); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; text-align: center; }
.unit-toggle { display: flex; border: 1px solid var(--border2); border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.unit-btn { padding: 0 12px; height: 100%; border: none; background: transparent; color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s; }
.unit-btn.active { background: var(--accent); color: #fff; }
.btn { display: block; width: 100%; padding: 14px; border-radius: var(--r2); border: none; font-size: 15px; font-weight: 600; cursor: pointer; transition: all .2s; text-align: center; margin-bottom: 10px; }
.btn-primary { background: var(--accent); color: var(--accent-text); }
.btn-secondary { background: var(--bg2); color: var(--text); border: 1px solid var(--border2); }
</style>
