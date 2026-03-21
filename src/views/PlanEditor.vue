<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlansStore } from '../stores/plans'
import Swal from 'sweetalert2'

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
const showExModal = ref(false)
const targetDayId = ref('')
const newEx = ref({ exercise_name: '', exercise_type: 'strength', sets: 3, reps: 10, rest_seconds: 60, special_notes: '' })
const editingExId = ref('')

function openAddExercise(dayId: string) {
  targetDayId.value = dayId
  editingExId.value = ''
  newEx.value = { exercise_name: '', exercise_type: 'strength', sets: 3, reps: 10, rest_seconds: 60, special_notes: '' }
  showExModal.value = true
}

function openEditExercise(exId: string, ex: any) {
  targetDayId.value = ex.training_day_id
  editingExId.value = exId
  newEx.value = { ...ex }
  showExModal.value = true
}

function saveExercise() {
  if (!newEx.value.exercise_name) return
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
          <div v-for="ex in plansStore.exercisesForDay(day.id)" :key="ex.id" class="ex-row" @click="openEditExercise(ex.id, ex)">
            <div style="flex:1">
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">{{ ex.exercise_name }}</div>
              <div style="font-size: 12px; color: var(--text2)">
                {{ ex.sets }} sets x {{ ex.reps }} reps • {{ ex.rest_seconds }}s rest
              </div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" style="width:100%; margin-top: 12px;" @click="openAddExercise(day.id)">+ Añadir Ejercicio</button>
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

    <!-- Modal Ejercicio -->
    <div v-if="showExModal" class="modal-overlay" @click.self="showExModal = false">
      <div class="modal-content" style="max-height: 80vh; overflow-y: auto;">
        <h3>{{ editingExId ? 'Editar Ejercicio' : 'Nuevo Ejercicio' }}</h3>
        
        <div class="form-group">
          <label>Nombre del Ejercicio</label>
          <input type="text" v-model="newEx.exercise_name" class="modal-input" placeholder="ej. Press de Banca">
        </div>

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

        <div style="display: flex; gap: 10px;">
          <div class="form-group" style="flex: 1">
            <label>Descanso (seg)</label>
            <input type="number" v-model="newEx.rest_seconds" class="modal-input">
          </div>
          <div class="form-group" style="flex: 1">
            <label>Tipo</label>
            <select v-model="newEx.exercise_type" class="modal-input">
              <option value="strength">Fuerza</option>
              <option value="cardio">Cardio</option>
              <option value="isometric">Isométrico</option>
            </select>
          </div>
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
    <div v-if="showProgModal" class="modal-overlay" @click.self="showProgModal = false">
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
.btn-primary { background: var(--accent); color: #000; }
.btn-secondary { background: var(--bg3); color: var(--text); border: 1px solid var(--border); }
.btn-danger { background: #2a1a1a; color: var(--red); border: 1px solid #3a2222; }
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
</style>
