<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkoutStore } from '../stores/workout'
import { useAuthStore } from '../stores/auth'
import { useUserStore } from '../stores/user'
import { TRAINING_MODALITIES, GOALS, GENDERS, TRAINING_LEVELS } from '../constants/modalities'
import { dbService } from '../services/localDb'
import Swal from 'sweetalert2'

const store = useWorkoutStore()
const authStore = useAuthStore()
const userStore = useUserStore()
const router = useRouter()
const msg = ref({ text: '', type: '' })

const weekInput = ref(store.currentWeek)
const themeInput = ref(store.themeMode || 'system')

const newWeight = ref<number | null>(null)

onMounted(async () => {
  await userStore.loadProfile()
  if (userStore.profile.weight_kg) {
    newWeight.value = userStore.profile.weight_kg
  }
})

const totalWeeks = computed(() => {
  store.dbUpdateTrigger; // force reactivity
  return store.totalWeeks;
})
function showMsg(text: string, type: string) {
  msg.value = { text, type }
  setTimeout(() => { msg.value = { text: '', type: '' } }, 3500)
}

function saveWeek() {
  if (weekInput.value >= 1 && weekInput.value <= totalWeeks.value) {
    store.setWeek(weekInput.value)
    showMsg('✓ Semana actualizada a ' + weekInput.value, 'ok')
  } else {
    showMsg('La semana debe estar entre 1 y ' + totalWeeks.value, 'err')
  }
}

function saveTheme() {
  store.setThemeMode(themeInput.value)
  showMsg('✓ Tema actualizado', 'ok')
}

function saveProfile() {
  userStore.saveProfile()
  showMsg('✓ Perfil actualizado', 'ok')
}

function toggleModality(id: string) {
  const idx = userStore.profile.modalities.indexOf(id)
  if (idx === -1) {
    userStore.profile.modalities.push(id)
  } else {
    userStore.profile.modalities.splice(idx, 1)
  }
  userStore.saveProfile()
}

function registerWeight() {
  if (!newWeight.value || newWeight.value <= 0) return
  userStore.addWeightEntry(newWeight.value)
  showMsg('✓ Peso registrado: ' + newWeight.value + 'kg', 'ok')
}

async function resetAll() {
  const result = await Swal.fire({
    title: '¿Estás seguro?',
    text: "Se borrarán todos los registros de entrenamiento y caché de planes locales.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ff4444',
    cancelButtonColor: '#333333',
    confirmButtonText: 'Sí, borrar todo',
    cancelButtonText: 'Cancelar',
    background: '#1a1a1a',
    color: '#ffffff'
  })

  if (!result.isConfirmed) return

  dbService.run("DELETE FROM workout_log")
  dbService.run("DELETE FROM config WHERE key='current_week'")
  
  // Limpiar caché de planes locales para forzar descarga o re-inicialización
  dbService.run("DELETE FROM plans")
  dbService.run("DELETE FROM training_days")
  dbService.run("DELETE FROM plan_exercises")
  dbService.run("DELETE FROM plan_progressions")
  
  store.setWeek(1)
  
  await Swal.fire({
    title: '¡Borrado!',
    text: 'Datos locales borrados. La app se recargará.',
    icon: 'success',
    background: '#1a1a1a',
    color: '#ffffff',
    confirmButtonColor: '#ccff00',
    timer: 1500,
    showConfirmButton: false
  })
  
  window.location.reload()
}

async function handleSignOut() {
  await authStore.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="pb-6">
    <div style="padding:calc(24px + env(safe-area-inset-top,0px)) 20px 10px">
      <div style="font-size:12px;color:var(--text2);font-weight:600;letter-spacing:.5px">CONFIGURACIÓN</div>
      <div style="font-size:28px;font-weight:800;letter-spacing:-.5px;margin-top:4px">Ajustes</div>
    </div>
    
    <div style="padding:12px 16px">
      <div v-if="msg.text" :class="['msg', msg.type]">{{ msg.text }}</div>

      <div class="cfg-lbl">Cuenta</div>
      <div style="background:var(--bg2); padding: 16px; border-radius: var(--r2); border: 1px solid var(--border); margin-bottom: 20px;">
        <div style="font-size: 14px; margin-bottom: 12px; word-break: break-all;">
          Sesión iniciada como:<br><strong style="color:var(--accent2)">{{ authStore.user?.email }}</strong>
        </div>
        <button class="btn btn-secondary" style="margin:0; padding:10px" @click="handleSignOut">Cerrar Sesión</button>
      </div>

      <div class="cfg-lbl">Mis Rutinas</div>
      <button class="btn btn-primary" style="margin-bottom: 20px;" @click="router.push('/plans')">Gestionar mis planes</button>

      <div class="cfg-lbl">Tema</div>
      <div style="display:flex;gap:10px;margin-bottom:20px">
        <div class="input-group" style="flex:1">
          <select v-model="themeInput" class="custom-select" @change="saveTheme">
            <option value="system">Igual que el sistema</option>
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
          </select>
        </div>
      </div>

      <div class="cfg-lbl">Semana actual</div>
      <div style="display:flex;gap:10px;margin-bottom:20px">
        <div class="input-group" style="flex:1">
          <label>Número (1–{{ totalWeeks }})</label>
          <input type="number" v-model="weekInput" min="1" :max="totalWeeks">
        </div>
        <div style="display:flex;align-items:flex-end">
          <button class="btn btn-primary" style="margin:0;padding:12px 20px;width:auto" @click="saveWeek">Guardar</button>
        </div>
      </div>

      <div class="separator"></div>

      <div class="cfg-lbl">Seguimiento de Peso</div>
      <div class="weight-card">
        <div style="display:flex; gap:10px; align-items: flex-end;">
          <div class="input-group" style="flex:1">
            <label>Registrar peso hoy (kg)</label>
            <input type="number" v-model="newWeight" step="0.1" placeholder="0.0">
          </div>
          <button class="btn btn-primary" style="margin:0; width: auto; padding: 12px 20px" @click="registerWeight">Anotar</button>
        </div>

        <div v-if="userStore.stats_history.length > 0" class="history-list">
          <div v-for="(entry, b) in userStore.stats_history" :key="b" class="history-item">
            <div class="history-date">{{ new Date(entry.recorded_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) }}</div>
            <div class="history-val">{{ entry.weight_kg }}<span style="font-size: 10px; margin-left: 2px;">kg</span></div>
            <div class="history-diff" v-if="b < userStore.stats_history.length - 1">
              <span :class="entry.weight_kg < userStore.stats_history[b+1].weight_kg ? 'down' : 'up'">
                {{ (entry.weight_kg - userStore.stats_history[b+1].weight_kg).toFixed(1) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="separator"></div>

      <div class="cfg-lbl">Mi Perfil</div>
      <div class="profile-card">
        <div class="input-grid">
          <div class="input-group">
            <label>Días / semana</label>
            <select v-model="userStore.profile.days_per_week" class="custom-select" @change="userStore.saveProfile()">
              <option v-for="d in 7" :key="d" :value="d">{{ d }} días</option>
            </select>
          </div>
          <div class="input-group">
            <label>Nivel de Exp.</label>
            <select v-model="userStore.profile.training_level" class="custom-select" @change="userStore.saveProfile()">
              <option v-for="l in TRAINING_LEVELS" :key="l.id" :value="l.id">{{ l.label.split(' ')[0] }}</option>
            </select>
          </div>

          <div class="input-group mt-4" style="grid-column: span 2;">
            <label>Duración del Plan</label>
            <select v-model="userStore.profile.plan_duration_weeks" class="custom-select" @change="userStore.saveProfile()">
              <option :value="4">4 Semanas (1 Mes)</option>
              <option :value="8">8 Semanas (2 Meses)</option>
              <option :value="12">12 Semanas (3 Meses)</option>
              <option :value="16">16 Semanas (4 Meses)</option>
            </select>
          </div>

          <div class="input-group">
            <label>Edad</label>
            <input type="number" v-model="userStore.profile.age" @change="saveProfile">
          </div>
          <div class="input-group">
            <label>Altura (cm)</label>
            <input type="number" v-model="userStore.profile.height_cm" @change="saveProfile">
          </div>
        </div>
        
        <div class="input-group mt-4">
          <label>Género</label>
          <select v-model="userStore.profile.gender" class="custom-select" @change="saveProfile">
            <option value="">Seleccionar...</option>
            <option v-for="g in GENDERS" :key="g.id" :value="g.id">{{ g.label }}</option>
          </select>
        </div>

        <div class="input-group mt-4">
          <label>Objetivo Principal</label>
          <select v-model="userStore.profile.goal" class="custom-select" @change="saveProfile">
            <option value="">Seleccionar...</option>
            <option v-for="g in GOALS" :key="g.id" :value="g.id">{{ g.label }}</option>
          </select>
        </div>

        <div class="cfg-lbl mt-6" style="font-size: 11px;">Equipamiento Disponible</div>
        <div class="modalities-grid">
          <div 
            v-for="m in TRAINING_MODALITIES" 
            :key="m.id" 
            class="modality-item"
            :class="{ active: userStore.profile.modalities.includes(m.id) }"
            @click="toggleModality(m.id)"
          >
            <span class="modality-icon">{{ m.icon }}</span>
            <span class="modality-label">{{ m.label }}</span>
            <div class="modality-check">
              <svg v-if="userStore.profile.modalities.includes(m.id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>
        </div>
      </div>


      <div class="separator"></div>

      <button class="btn btn-danger mt-6" @click="resetAll">Borrar todos los datos locales</button>
    </div>
  </div>
</template>

<style scoped>
.cfg-lbl { font-size: 13px; font-weight: 600; color: var(--text2); margin-bottom: 8px; text-transform: uppercase; letter-spacing: .4px; }
textarea { width: 100%; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r2); color: var(--text); font-size: 12px; font-family: monospace; padding: 12px; resize: vertical; min-height: 100px; line-height: 1.5; }
textarea:focus { outline: none; border-color: var(--accent); }
.input-group { display: flex; flex-direction: column; gap: 6px; }
.input-group label { font-size: 12px; color: var(--text2); font-weight: 500; }
input[type=number], .custom-select { background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 16px; padding: 12px; width: 100%; box-sizing: border-box; appearance: none; }
input:focus, .custom-select:focus { outline: none; border-color: var(--accent); }
.btn { display: block; width: 100%; padding: 14px; border-radius: var(--r2); border: none; font-size: 15px; font-weight: 600; cursor: pointer; transition: all .2s; text-align: center; }
.btn-primary { background: var(--accent); color: var(--accent-text); }
.btn-secondary { background: transparent; color: var(--text); border: 1px solid var(--border2); }
.btn-danger { background: var(--danger-bg); color: var(--red); border: 1px solid var(--danger-border); }
.msg { padding: 10px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 10px; }
.msg.ok { background: var(--success-bg); color: var(--green); border: 1px solid var(--success-border); }
.msg.err { background: var(--danger-bg); color: var(--red); border: 1px solid var(--danger-border); }

.separator { height: 1px; background: var(--border); margin: 30px 0; }
.profile-card, .weight-card { background: var(--bg2); padding: 16px; border-radius: var(--r2); border: 1px solid var(--border); margin-bottom: 20px; }
.input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.modalities-grid { display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 12px; }
.modality-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg3); border-radius: 10px; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s; position: relative; }
.modality-item.active { border-color: var(--accent); background: rgba(200,255,0,0.05); }
.modality-icon { font-size: 20px; }
.modality-label { font-size: 14px; font-weight: 500; }
.modality-check { width: 18px; height: 18px; border: 1px solid var(--border); border-radius: 4px; margin-left: auto; display: flex; align-items: center; justify-content: center; }
.modality-item.active .modality-check { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }

.history-list { margin-top: 20px; border-top: 1px solid var(--border); padding-top: 10px; }
.history-item { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.history-date { font-size: 12px; color: var(--text2); width: 60px; }
.history-val { font-size: 16px; font-weight: 700; flex: 1; }
.history-diff { font-size: 11px; font-weight: 600; }
.history-diff .up { color: var(--red); }
.history-diff .up::before { content: '+'; }
.history-diff .down { color: var(--green); }
.mt-4 { margin-top: 16px; }
.mt-6 { margin-top: 24px; }
.mt-8 { margin-top: 32px; }
</style>
