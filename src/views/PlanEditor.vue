<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlansStore } from '../stores/plans'
import Swal from 'sweetalert2'
import ExerciseIcon from '../components/ExerciseIcon.vue'

const route = useRoute()
const router = useRouter()
const plansStore = usePlansStore()

const planId = route.params.id as string

const plan = computed(() => plansStore.plans.find(p => p.id === planId))
const days = computed(() => plansStore.trainingDays.filter(d => d.plan_id === planId && !d.deleted).sort((a,b) => a.day_number - b.day_number))
const progressions = computed(() => plansStore.progressionsForPlan(planId))

const activeTab = ref('exercises') // 'exercises' | 'progression'

const editingPlanName = ref(false)
const tempPlanName = ref('')

function editPlanName() {
  if (!plan.value) return
  tempPlanName.value = plan.value.name
  editingPlanName.value = true
}

function savePlanName() {
  if (!tempPlanName.value.trim()) return
  plansStore.updatePlan(planId, tempPlanName.value.trim())
  editingPlanName.value = false
}

async function addDay() {
  const { value: name } = await Swal.fire({
    title: 'Añadir Día',
    input: 'text',
    inputLabel: 'Nombre de la sesión',
    inputPlaceholder: 'ej. Empuje, Pierna',
    showCancelButton: true,
    confirmButtonColor: '#ccff00',
    cancelButtonColor: '#333333',
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar',
    background: '#1a1a1a',
    color: '#ffffff',
    customClass: { confirmButton: 'text-black font-bold' }
  })

  if (name) {
    plansStore.addDay(planId, name)
  }
}

async function deleteDay(id: string) {
  const result = await Swal.fire({
    title: '¿Borrar día?',
    text: "Se borrará este día y todos sus ejercicios.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ff4444',
    cancelButtonColor: '#333333',
    confirmButtonText: 'Sí, borrar',
    cancelButtonText: 'Cancelar',
    background: '#1a1a1a',
    color: '#ffffff'
  })

  if (result.isConfirmed) {
    plansStore.deleteDay(id)
  }
}

// Exercise Modal
const showTypeSelectModal = ref(false)
const showExModal = ref(false)
const targetDayId = ref('')
const editingExId = ref('')

const defaultExProps = () => ({
  exercise_name: '', exercise_type: 'strength', sets: 3, reps: 10, rest_seconds: 60, special_notes: '',
  group_type: '', group_id: '', tempo: 'normal',
  duration_min: 15, duration_sec: 45, incline_pct: 0, speed_kmh: 0, target_heart_rate_bpm: 130, intensity_mode: 'LISS'
})
const newEx = ref<any>(defaultExProps())

function openAddExerciseFlow(dayId: string) {
  targetDayId.value = dayId
  editingExId.value = ''
  showTypeSelectModal.value = true
}

function selectExerciseType(type: string) {
  newEx.value = defaultExProps()
  newEx.value.exercise_type = type
  
  if (type === 'isometric') newEx.value.rest_seconds = 45;
  if (type === 'cardio') newEx.value.rest_seconds = 0;

  showTypeSelectModal.value = false
  showExModal.value = true
}

function openEditExercise(exId: string, ex: any) {
  targetDayId.value = ex.training_day_id
  editingExId.value = exId
  newEx.value = { ...defaultExProps(), ...ex }
  showExModal.value = true
}

function autoSetRestTime() {
  if (newEx.value.group_type === 'superset' || newEx.value.group_type === 'triset' || newEx.value.group_type === 'giant_set') {
    newEx.value.rest_seconds = 30
  } else if (newEx.value.group_type === 'pyramid' || newEx.value.group_type === 'drop_set') {
    newEx.value.rest_seconds = 90
  } else if (newEx.value.group_type === 'finisher') {
    newEx.value.rest_seconds = 20
  } else if (newEx.value.exercise_type === 'strength') {
    newEx.value.rest_seconds = 60
  } else if (newEx.value.exercise_type === 'isometric') {
    newEx.value.rest_seconds = 45
  }
}

function saveExercise() {
  if (!newEx.value.exercise_name) return
  
  if (newEx.value.group_type && !newEx.value.group_id) {
    // Generate a simple group_id if not present
    newEx.value.group_id = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + Math.floor(Math.random() * 100);
  }
  if (!newEx.value.group_type) {
    newEx.value.group_id = ''
  }

  if (editingExId.value) {
    plansStore.updateExercise(editingExId.value, newEx.value)
  } else {
    plansStore.addExercise(targetDayId.value, newEx.value)
  }
  showExModal.value = false
}

async function deleteExercise(id: string) {
  const result = await Swal.fire({
    title: '¿Borrar ejercicio?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ff4444',
    cancelButtonColor: '#333333',
    confirmButtonText: 'Sí, borrar',
    cancelButtonText: 'Cancelar',
    background: '#1a1a1a',
    color: '#ffffff'
  })

  if (result.isConfirmed) {
    plansStore.deleteExercise(id)
    showExModal.value = false
  }
}

function toggleDay(dayId: string) {
  const el = document.getElementById('day-content-' + dayId)
  if (el) {
    el.style.display = el.style.display === 'none' ? 'block' : 'none'
  }
}

function getGroupStyle(groupType?: string | null) {
  if (!groupType) return {};
  if (groupType === 'superset') return { borderLeft: '4px solid #b388ff', paddingLeft: '12px' };
  if (groupType === 'triset') return { borderLeft: '4px solid #82b1ff', paddingLeft: '12px' };
  if (groupType === 'giant_set') return { borderLeft: '4px solid #b9f6ca', paddingLeft: '12px' };
  if (groupType === 'pyramid') return { borderLeft: '4px solid #ffe57f', paddingLeft: '12px' };
  if (groupType === 'drop_set') return { borderLeft: '4px solid #ff8a80', paddingLeft: '12px' };
  if (groupType === 'finisher') return { borderLeft: '4px solid #ffd180', paddingLeft: '12px' };
  return {};
}

// Progression Modal
const showProgModal = ref(false)
const editingProgId = ref('')
const newProg = ref({ week_number: 1, phase: 'adaptation', weight_change_pct: '0%', reps_change: 'maintain', rpe_target: 7, system_focus: '' })

function addProgression() {
  editingProgId.value = ''
  const nextW = progressions.value.length > 0 ? Math.max(...progressions.value.map(p => p.week_number)) + 1 : 1
  newProg.value = { week_number: nextW, phase: 'adaptation', weight_change_pct: '0%', reps_change: 'maintain', rpe_target: 7, system_focus: '' }
  showProgModal.value = true
}

function openEditProgression(prog: any) {
  editingProgId.value = prog.id
  newProg.value = { ...prog }
  showProgModal.value = true
}

function saveProgression() {
  if (editingProgId.value) {
    plansStore.updateProgression(editingProgId.value, newProg.value)
  } else {
    plansStore.addProgression(planId, newProg.value)
  }
  showProgModal.value = false
}

async function deleteProgression(id: string) {
  const result = await Swal.fire({
    title: '¿Borrar semana?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ff4444',
    cancelButtonColor: '#333333',
    confirmButtonText: 'Sí, borrar',
    cancelButtonText: 'Cancelar',
    background: '#1a1a1a',
    color: '#ffffff'
  })

  if (result.isConfirmed) {
    plansStore.deleteProgression(id)
    showProgModal.value = false
  }
}
</script>

<template>
  <div class="pb-6" v-if="plan">
    <div style="padding:calc(24px + env(safe-area-inset-top,0px)) 20px 10px; display: flex; align-items: center; gap: 10px;">
      <button class="back-btn" @click="router.push('/plans')">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <div style="flex: 1">
        <div style="font-size:12px;color:var(--text2);font-weight:600;letter-spacing:.5px">EDITAR PLAN</div>
        <div v-if="!editingPlanName" style="font-size:28px;font-weight:800;letter-spacing:-.5px;margin-top:4px; display: flex; align-items: center; gap: 8px;" @click="editPlanName">
          {{ plan.name }}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="16 3 21 8 8 21 3 21 3 16 16 3"></polygon></svg>
        </div>
        <div v-else style="margin-top: 4px; display: flex; gap: 8px;">
          <input type="text" v-model="tempPlanName" class="modal-input" style="padding: 8px;" @keyup.enter="savePlanName" @blur="savePlanName" ref="nameInput" autofocus>
        </div>
      </div>
    </div>
    
    <div class="tabs">
      <div class="tab" :class="{ active: activeTab === 'exercises' }" @click="activeTab = 'exercises'">Ejercicios</div>
      <div class="tab" :class="{ active: activeTab === 'progression' }" @click="activeTab = 'progression'">Progresión</div>
    </div>

    <!-- Pestaña: Ejercicios -->
    <div style="padding:12px 16px" v-if="activeTab === 'exercises'">
      <div v-for="day in days" :key="day.id" class="day-card">
        <div class="day-header" @click="toggleDay(day.id)">
          <div style="font-weight: 700; font-size: 16px;">Día {{ day.day_number }}: {{ day.session_name }}</div>
          <div style="color: var(--text2); font-size: 12px; display:flex; gap: 10px; align-items: center;">
            <span>{{ plansStore.exercisesForDay(day.id).length }} ej.</span>
            <button class="btn-icon" @click.stop="deleteDay(day.id)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>

        <div :id="'day-content-' + day.id" class="day-content" style="display: none;">
          <div v-for="ex in plansStore.exercisesForDay(day.id)" :key="ex.id" class="ex-row" :style="getGroupStyle(ex.group_type)" @click="openEditExercise(ex.id, ex)">
            <div style="margin-right: 12px; display:flex; align-items:center;">
              <ExerciseIcon :name="ex.exercise_name" :type="ex.exercise_type" />
            </div>
            <div style="flex:1">
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                {{ ex.exercise_name }}
                <span v-if="ex.group_type" class="group-badge" :class="'badge-' + ex.group_type">{{ ex.group_type.replace('_', ' ') }}</span>
              </div>
              <div style="font-size: 12px; color: var(--text2)">
                <span v-if="ex.exercise_type === 'strength'">{{ ex.sets }} sets x {{ ex.reps }} reps</span>
                <span v-else-if="ex.exercise_type === 'cardio'">{{ ex.duration_min }} min • Incline: {{ ex.incline_pct }}%</span>
                <span v-else-if="ex.exercise_type === 'isometric'">{{ ex.sets }} sets x {{ ex.duration_sec }}s</span>
                • {{ ex.rest_seconds }}s rest
              </div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" style="width:100%; margin-top: 12px;" @click="openAddExerciseFlow(day.id)">+ Añadir Ejercicio</button>
        </div>
      </div>

      <button class="btn btn-primary" style="margin-top: 20px;" @click="addDay">+ Añadir Día</button>
    </div>

    <!-- Pestaña: Progresión -->
    <div style="padding:12px 16px" v-if="activeTab === 'progression'">
      <div v-for="prog in progressions" :key="prog.id" class="day-card" style="padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;" @click="openEditProgression(prog)">
        <div>
          <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">Semana {{ prog.week_number }} <span style="font-size: 12px; font-weight: normal; color: var(--text2)">({{ prog.phase }})</span></div>
          <div style="font-size: 13px; color: var(--text2);">
            Peso: <strong style="color:var(--accent)">{{ prog.weight_change_pct }}</strong> | RPE: {{ prog.rpe_target }} | Reps: {{ prog.reps_change }}
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </div>

      <button class="btn btn-primary" style="margin-top: 20px;" @click="addProgression">+ Añadir Semana</button>
    </div>

    <!-- Modal Seleccion de Tipo -->
    <div v-if="showTypeSelectModal" class="modal-overlay">
      <div class="modal-content" style="max-height: 80vh; overflow-y: auto;">
        <h3 style="text-align: center; margin-bottom: 24px;">Tipo de Ejercicio</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button class="btn btn-secondary" style="display:flex; align-items:center; justify-content:center; gap:10px; padding:20px;" @click="selectExerciseType('strength')">
            <span style="font-size: 24px;">🏋️‍♂️</span> Fuerza
          </button>
          <button class="btn btn-secondary" style="display:flex; align-items:center; justify-content:center; gap:10px; padding:20px;" @click="selectExerciseType('cardio')">
            <span style="font-size: 24px;">🏃‍♂️</span> Cardio
          </button>
          <button class="btn btn-secondary" style="display:flex; align-items:center; justify-content:center; gap:10px; padding:20px;" @click="selectExerciseType('isometric')">
            <span style="font-size: 24px;">⏱️</span> Isométrico
          </button>
        </div>
        <button class="btn btn-secondary" style="margin-top: 24px; background: transparent; border: none;" @click="showTypeSelectModal = false">Cancelar</button>
      </div>
    </div>

    <!-- Modal Ejercicio -->
    <div v-if="showExModal" class="modal-overlay">
      <div class="modal-content" style="max-height: 80vh; overflow-y: auto;">
        <h3>
          {{ editingExId ? 'Editar' : 'Nuevo' }} 
          {{ newEx.exercise_type === 'strength' ? 'Fuerza' : newEx.exercise_type === 'cardio' ? 'Cardio' : 'Isométrico' }}
        </h3>
        
        <div class="form-group">
          <label>Nombre del Ejercicio</label>
          <input type="text" v-model="newEx.exercise_name" class="modal-input" placeholder="ej. Press de Banca">
        </div>

        <!-- Campos para FUERZA -->
        <template v-if="newEx.exercise_type === 'strength'">
          <div style="display: flex; gap: 10px;">
            <div class="form-group" style="flex: 1">
              <label>Series</label>
              <input type="number" v-model="newEx.sets" class="modal-input">
            </div>
            <div class="form-group" style="flex: 1">
              <label>Reps</label>
              <input type="number" v-model="newEx.reps" class="modal-input">
            </div>
          </div>
          
          <div class="form-group">
            <label>Tempo (Opcional)</label>
            <select v-model="newEx.tempo" class="modal-input">
              <option value="normal">Normal</option>
              <option value="controlled">Controlado</option>
              <option value="slow">Lento</option>
              <option value="explosive">Explosivo</option>
              <option value="isometric">Isométrico</option>
              <option value="3210">3210</option>
              <option value="4010">4010</option>
            </select>
          </div>

          <div class="form-group">
            <label>Agrupar / Vincular (Opcional)</label>
            <select v-model="newEx.group_type" class="modal-input" @change="autoSetRestTime">
              <option value="">Ninguno</option>
              <option value="superset">Superset (Morado, 30s)</option>
              <option value="triset">Triset (Azul, 30s)</option>
              <option value="giant_set">Giant Set (Verde, 30s)</option>
              <option value="pyramid">Pyramid (Amarillo, 90s)</option>
              <option value="drop_set">Drop Set (Rojo, 90s)</option>
              <option value="finisher">Finisher (Naranja, 20s)</option>
            </select>
          </div>
          
          <div class="form-group" v-if="newEx.group_type">
            <label>Group ID (Mismo ID agrupa ejercicios)</label>
            <input type="text" v-model="newEx.group_id" class="modal-input" placeholder="ej. A">
          </div>
        </template>

        <!-- Campos para CARDIO -->
        <template v-if="newEx.exercise_type === 'cardio'">
          <div style="display: flex; gap: 10px;">
            <div class="form-group" style="flex: 1">
              <label>Duración (min)</label>
              <input type="number" v-model="newEx.duration_min" class="modal-input">
            </div>
            <div class="form-group" style="flex: 1">
              <label>Inclinación (%)</label>
              <input type="number" v-model="newEx.incline_pct" class="modal-input">
            </div>
          </div>
          <div style="display: flex; gap: 10px;">
            <div class="form-group" style="flex: 1">
              <label>Velocidad (km/h)</label>
              <input type="number" step="0.1" v-model="newEx.speed_kmh" class="modal-input">
            </div>
            <div class="form-group" style="flex: 1">
              <label>FC Objetivo (bpm)</label>
              <input type="number" v-model="newEx.target_heart_rate_bpm" class="modal-input">
            </div>
          </div>
          <div class="form-group">
            <label>Modo</label>
            <select v-model="newEx.intensity_mode" class="modal-input">
              <option value="LISS">LISS</option>
              <option value="HIIT">HIIT</option>
              <option value="MISS">MISS</option>
            </select>
          </div>
        </template>

        <!-- Campos para ISOMÉTRICO -->
        <template v-if="newEx.exercise_type === 'isometric'">
          <div style="display: flex; gap: 10px;">
            <div class="form-group" style="flex: 1">
              <label>Series</label>
              <input type="number" v-model="newEx.sets" class="modal-input">
            </div>
            <div class="form-group" style="flex: 1">
              <label>Duración (seg)</label>
              <input type="number" v-model="newEx.duration_sec" class="modal-input">
            </div>
          </div>
        </template>

        <!-- Global para todos excepto cardio (descanso opcional) -->
        <div class="form-group">
          <label>Descanso (seg)</label>
          <input type="number" v-model="newEx.rest_seconds" class="modal-input">
        </div>

        <div class="form-group">
          <label>Notas especiales</label>
          <input type="text" v-model="newEx.special_notes" class="modal-input" placeholder="ej. Pausa 1s abajo">
        </div>

        <div style="display:flex; gap:10px; margin-top:20px;">
          <button class="btn btn-secondary" @click="showExModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="saveExercise">Guardar</button>
        </div>
        <button v-if="editingExId" class="btn btn-danger" style="margin-top: 10px;" @click="deleteExercise(editingExId)">Borrar Ejercicio</button>
      </div>
    </div>

    <!-- Modal Progresion -->
    <div v-if="showProgModal" class="modal-overlay">
      <div class="modal-content" style="max-height: 80vh; overflow-y: auto;">
        <h3>{{ editingProgId ? 'Editar Semana ' + newProg.week_number : 'Nueva Semana' }}</h3>
        
        <div class="form-group" v-if="!editingProgId">
          <label>Número de Semana</label>
          <input type="number" v-model="newProg.week_number" class="modal-input">
        </div>

        <div class="form-group">
          <label>Fase</label>
          <input type="text" v-model="newProg.phase" class="modal-input" placeholder="ej. adaptation, intensity">
        </div>

        <div style="display: flex; gap: 10px;">
          <div class="form-group" style="flex: 1">
            <label>% Cambio Peso</label>
            <input type="text" v-model="newProg.weight_change_pct" class="modal-input" placeholder="ej. +2.5%">
          </div>
          <div class="form-group" style="flex: 1">
            <label>RPE Objetivo</label>
            <input type="number" v-model="newProg.rpe_target" step="0.5" class="modal-input">
          </div>
        </div>

        <div class="form-group">
          <label>Cambio Reps</label>
          <input type="text" v-model="newProg.reps_change" class="modal-input" placeholder="ej. maintain">
        </div>
        
        <div class="form-group">
          <label>Enfoque (Opcional)</label>
          <input type="text" v-model="newProg.system_focus" class="modal-input" placeholder="ej. strength_peak">
        </div>

        <div style="display:flex; gap:10px; margin-top:20px;">
          <button class="btn btn-secondary" @click="showProgModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="saveProgression">Guardar</button>
        </div>
        <button v-if="editingProgId" class="btn btn-danger" style="margin-top: 10px;" @click="deleteProgression(editingProgId)">Borrar Semana</button>
      </div>
    </div>

  </div>
  <div v-else style="padding: 100px 20px; text-align: center; color: var(--text2);">
    Plan no encontrado
  </div>
</template>

<style scoped>
.back-btn { background: var(--bg2); border: 1px solid var(--border); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: var(--text); cursor: pointer; padding: 0; }
.tabs { display: flex; border-bottom: 1px solid var(--border); margin-top: 10px; }
.tab { flex: 1; text-align: center; padding: 12px; font-weight: 600; font-size: 14px; color: var(--text2); cursor: pointer; border-bottom: 2px solid transparent; }
.tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.day-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r2); margin-bottom: 12px; overflow: hidden; }
.day-header { padding: 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: var(--bg3); }
.day-content { padding: 12px 16px; border-top: 1px solid var(--border); }
.ex-row { padding: 12px 0; border-bottom: 1px solid var(--border2); display: flex; align-items: center; cursor: pointer; }
.ex-row:last-child { border-bottom: none; }
.btn { width: 100%; padding: 14px; border-radius: var(--r2); border: none; font-size: 15px; font-weight: 600; cursor: pointer; transition: all .2s; text-align: center; }
.btn-primary { background: var(--accent); color: var(--accent-text); }
.btn-secondary { background: var(--bg3); color: var(--text); border: 1px solid var(--border); }
.btn-danger { background: var(--danger-bg); color: var(--red); border: 1px solid var(--danger-border); }
.btn-sm { padding: 8px 12px; font-size: 13px; border-radius: 8px; }
.btn-icon { background: transparent; border: none; color: var(--text2); cursor: pointer; padding: 4px; display: flex; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal-content { background: var(--bg); padding: 24px; border-radius: var(--r2); width: 100%; max-width: 400px; border: 1px solid var(--border); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
.modal-content h3 { margin: 0 0 16px 0; font-size: 20px; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 12px; font-weight: 600; color: var(--text2); margin-bottom: 6px; }
.modal-input { width: 100%; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 12px; font-size: 16px; box-sizing: border-box; }
.modal-input:focus { outline: none; border-color: var(--accent); }
select.modal-input { appearance: none; }
.group-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; text-transform: uppercase; }
.badge-superset { background: #b388ff; color: #000; }
.badge-triset { background: #82b1ff; color: #000; }
.badge-giant_set { background: #b9f6ca; color: #000; }
.badge-pyramid { background: #ffe57f; color: #000; }
.badge-drop_set { background: #ff8a80; color: #000; }
.badge-finisher { background: #ffd180; color: #000; }
</style>
