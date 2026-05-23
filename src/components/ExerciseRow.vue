<script setup lang="ts">
import { computed } from 'vue'
import { useWorkoutStore } from '../stores/workout'
import ExerciseIcon from './ExerciseIcon.vue'

const props = defineProps<{
  exercise: any
  dayLabel: string
  dayIndex: number
  exIndex: number
  isLogged: boolean
}>()

const emit = defineEmits(['open-modal'])

const store = useWorkoutStore()
const info = computed(() => store.getWeekInfo(store.currentWeek))

const rawName = computed(() => props.exercise.exercise_name || props.exercise.node || 'exercise')
const name = computed(() => rawName.value.replace(/_/g, ' '))
const exType = computed(() => props.exercise.exercise_type || (props.exercise.duration_min || props.exercise.duration_minutes ? 'cardio' : props.exercise.duration_sec ? 'isometric' : 'strength'))
const isGrouped = computed(() => !!props.exercise.group_id)

const prev = computed(() => store.getPrevLog(props.dayLabel, name.value))
const isEffectivelyLogged = computed(() => props.isLogged || !!prev.value)

const calculatedSets = computed(() => {
  const ex = props.exercise
  let sets = ex.sets || (exType.value === 'isometric' ? 3 : 1)
  if (info.value.phase === 'deload' && ex.sets) {
    sets = Math.max(1, Math.ceil(ex.sets / 2))
  }
  return sets
})

const calculatedReps = computed(() => {
  const ex = props.exercise
  let reps = ex.reps || ex.duration_sec || 0
  
  if (exType.value === 'strength') {
    if (info.value.reps_change && info.value.reps_change.includes('+2')) {
      reps = (parseInt(reps as any) || 0) + 2
    } else if (info.value.reps_change === '+1 rep') {
      reps = (parseInt(reps as any) || 0) + 1
    }
  }
  return reps
})

const meta = computed(() => {
  const ex = props.exercise
  const p = prev.value
  
  if (exType.value === 'cardio') {
    let durMin = ex.duration_min || ex.duration_minutes || 15
    let incline = ex.incline_pct || ex.incline_percentage || 0
    let speed = ex.speed_kmh || '—'
    let hr = ex.target_heart_rate_bpm || null
    
    // Si ya fue completado, usar los datos reales del log
    if (p && p.length > 0) {
      durMin = p[1] || durMin // reps (duración)
      speed = p[2] || speed // weight (velocidad)
      hr = p[3] || hr // rpe (hr)
      
      const prevNotes = p[4] || ''
      const inclineMatch = prevNotes.match(/incline:([\d.]+)%/)
      if (inclineMatch) incline = parseFloat(inclineMatch[1])
    }
    
    let m = `${durMin} min · ${incline}% · ${speed} km/h`
    if (hr) m += ` · ♥ ${hr}bpm`
    return m
  } 
  
  if (exType.value === 'isometric') {
    let sets = calculatedSets.value
    let durSec = calculatedReps.value
    
    if (p && p.length > 0) {
      sets = p[0] || sets
      durSec = p[1] || durSec
    }
    
    return `${sets} × ${durSec}s`
  } 
  
  if (ex.group_type === 'pyramid' && ex.pyramid_reps) {
    return ex.pyramid_reps.map((r: any, i: number) => `${ex.pyramid_weights_kg?.[i]||'?'}kg×${r}`).join(' → ')
  } 
  
  let sets = calculatedSets.value
  let reps = calculatedReps.value
  
  let weight = ex.current_weight_kg || null
  
  if (p && p.length > 0 && !ex.group_type?.includes('pyramid')) {
    sets = p[0] || sets
    reps = p[1] || reps
    weight = p[2] || weight
  }
  
  let m = `${sets} × ${reps}`
  if (weight) m += ` · ${weight}kg`
  if (ex.max_safety_limit_kg) m += ` ⚠${ex.max_safety_limit_kg}kg`
  return m
})

const tags = computed(() => {
  const t = []
  const ex = props.exercise
  if (exType.value === 'cardio') t.push({ class: 'type-cardio', text: ex.intensity_mode || 'cardio' })
  if (exType.value === 'isometric') t.push({ class: 'type-isometric', text: 'isométrico' })
  if (isGrouped.value) {
    const labels: Record<string, string> = { superset: 'superset', triset: 'triset', giant_set: 'giant set', pyramid: 'pirámide', drop_set: 'drop set', finisher: 'finisher' }
    const css: Record<string, string> = { superset: 'group-superset', triset: 'group-triset', giant_set: 'group-giant', pyramid: 'group-pyramid', drop_set: 'group-dropset', finisher: 'group-finisher' }
    t.push({ class: css[ex.group_type] || 'group-superset', text: `${labels[ex.group_type] || ex.group_type} ${ex.group_id}` })
  }
  if (ex.tempo && ex.tempo !== 'normal') t.push({ class: 'tempo', text: ex.tempo })
  return t
})

const restSeconds = computed(() => {
  const ex = props.exercise
  if (ex.rest_seconds != null) return ex.rest_seconds
  
  const REST_DEFAULTS: Record<string, number> = {
    strength: 60, isometric: 45, cardio: 0,
    superset: 30, triset: 30, giant_set: 30,
    finisher: 20, pyramid: 90, drop_set: 90
  }
  if (ex.group_id && ex.group_type && REST_DEFAULTS[ex.group_type] != null) return REST_DEFAULTS[ex.group_type]
  return REST_DEFAULTS[exType.value] ?? 60
})

const fmtRest = computed(() => {
  const sec = restSeconds.value
  if (!sec) return null
  return sec >= 60 ? `${Math.floor(sec/60)}min ${sec%60>0?sec%60+'s':''}`.trim() : `${sec}s`
})

const suggestedWeight = computed(() => store.getSuggestedWeight(name.value, info.value, exType.value, props.exercise.group_type))

function handleLogClick() {
  const sugForModal = (exType.value === 'strength' && props.exercise.group_type !== 'pyramid') ? suggestedWeight.value : null
  const preWeightFinal = sugForModal ? sugForModal.kg : (props.exercise.current_weight_kg || 0)
  
  emit('open-modal', {
    dayLabel: props.dayLabel,
    name: name.value,
    sets: calculatedSets.value,
    reps: calculatedReps.value,
    logId: `${props.dayIndex}-${props.exIndex}`,
    exType: exType.value,
    preWeight: preWeightFinal,
    safetyLimit: props.exercise.max_safety_limit_kg || 0,
    duration_min: props.exercise.duration_min || props.exercise.duration_minutes || 15,
    incline_pct: props.exercise.incline_pct || 0,
    speed_kmh: props.exercise.speed_kmh || 0,
    target_hr: props.exercise.target_heart_rate_bpm || 0,
    pyramid_reps: props.exercise.pyramid_reps || null,
    pyramid_weights: props.exercise.pyramid_weights_kg || null,
    restSec: restSeconds.value,
    suggestedKg: sugForModal ? sugForModal.kg : null,
    suggestedChange: sugForModal ? sugForModal.change : null
  })
}
</script>

<template>
  <div class="ex-row" :class="{ 'is-grouped': isGrouped }">
    <div class="ex-icon">
      <ExerciseIcon :name="rawName" :type="exType" />
    </div>
    
    <div class="ex-info">
      <div class="ex-name">{{ name }}</div>
      <div class="ex-meta">{{ meta }}</div>
      
      <div v-if="tags.length > 0" class="ex-tags">
        <span v-for="(tag, idx) in tags" :key="idx" class="ex-tag" :class="tag.class">
          {{ tag.text }}
        </span>
      </div>
      
      <div v-if="exercise.special_notes" class="ex-hint">
        {{ exercise.special_notes.replace(/_/g, ' ') }}
      </div>
      
      <div v-if="suggestedWeight" class="ex-suggested">
        {{ suggestedWeight.change === '=' ? '→' : (suggestedWeight.change.startsWith('+') ? '↑' : '↓') }} 
        Peso sugerido: {{ suggestedWeight.kg }}kg
        <span style="opacity:.6;font-weight:400">({{ suggestedWeight.change }} vs sem. {{ suggestedWeight.fromWeek||'ant.' }})</span>
      </div>
      
      <div v-if="fmtRest" class="ex-rest">⏱ descanso: {{ fmtRest }}</div>
    </div>
    
    <button class="ex-log-btn" :class="{ 'logged': isEffectivelyLogged }" @click="handleLogClick">
      {{ isEffectivelyLogged ? '✓' : 'Log' }}
    </button>
  </div>
</template>

<style scoped>
.ex-row { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border); gap: 10px; }
.ex-row:last-child { border-bottom: none; }
.ex-icon { width: 36px; height: 36px; border-radius: 8px; background: var(--bg3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ex-info { flex: 1; min-width: 0; }
.ex-name { font-size: 14px; font-weight: 500; text-transform: capitalize; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ex-meta { font-size: 12px; color: var(--text2); margin-top: 2px; }
.ex-log-btn { background: var(--bg3); border: 1px solid var(--border2); color: var(--text); border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.ex-log-btn.logged { background: var(--accent); border-color: var(--accent); color: #fff; }
.ex-hint { font-size: 11px; color: var(--accent2); margin-top: 3px; font-style: italic; opacity: .8; }
.ex-rest { font-size: 11px; color: var(--text3); margin-top: 2px; }
.ex-suggested { font-size: 11px; color: var(--green); margin-top: 2px; font-weight: 600; }

.ex-tags { display: flex; gap: 5px; margin-top: 4px; flex-wrap: wrap; }
.ex-tag { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px; background: var(--bg4); color: var(--text2); border: 1px solid var(--border); }
.ex-tag.superset { background: rgba(167,139,250,.12); color: var(--accent2); border-color: rgba(167,139,250,.3); }
.ex-tag.tempo { background: rgba(251,191,36,.1); color: var(--amber); border-color: rgba(251,191,36,.25); }
.ex-row.is-grouped { border-left: 2px solid var(--accent2); }

.ex-tag.group-superset { background: rgba(167,139,250,.12); color: var(--accent2); border-color: rgba(167,139,250,.3); }
.ex-tag.group-triset { background: rgba(96,165,250,.12); color: var(--blue); border-color: rgba(96,165,250,.3); }
.ex-tag.group-giant { background: rgba(52,211,153,.12); color: var(--green); border-color: rgba(52,211,153,.3); }
.ex-tag.group-pyramid { background: rgba(251,191,36,.12); color: var(--amber); border-color: rgba(251,191,36,.3); }
.ex-tag.group-dropset { background: rgba(248,113,113,.12); color: var(--red); border-color: rgba(248,113,113,.3); }
.ex-tag.group-finisher { background: rgba(251,146,60,.12); color: #fb923c; border-color: rgba(251,146,60,.3); }
.ex-tag.type-cardio { background: rgba(52,211,153,.1); color: var(--green); border-color: rgba(52,211,153,.25); }
.ex-tag.type-isometric { background: rgba(96,165,250,.1); color: var(--blue); border-color: rgba(96,165,250,.25); }
</style>
