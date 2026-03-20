<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkoutStore } from '../stores/workout'
import { useAuthStore } from '../stores/auth'
import { dbService } from '../services/localDb'

const store = useWorkoutStore()
const authStore = useAuthStore()
const router = useRouter()
const msg = ref({ text: '', type: '' })

const weekInput = ref(store.currentWeek)
const exInput = ref('')
const progInput = ref('')

onMounted(() => {
  exInput.value = JSON.stringify(store.exercises, null, 2)
  progInput.value = JSON.stringify(store.progression, null, 2)
})

function showMsg(text: string, type: string) {
  msg.value = { text, type }
  setTimeout(() => { msg.value = { text: '', type: '' } }, 3500)
}

function saveWeek() {
  if (weekInput.value >= 1 && weekInput.value <= 14) {
    store.setWeek(weekInput.value)
    showMsg('✓ Semana actualizada a ' + weekInput.value, 'ok')
  } else {
    showMsg('La semana debe estar entre 1 y 14', 'err')
  }
}

function resetAll() {
  if (!confirm('¿Borrar TODOS los registros de entrenamiento?')) return
  dbService.run("DELETE FROM workout_log")
  dbService.run("DELETE FROM config WHERE key='current_week'")
  store.setWeek(1)
  showMsg('✓ Datos borrados', 'ok')
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
      <div style="font-size:28px;font-weight:800;letter-spacing:-.5px;margin-top:4px">Programas</div>
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

      <div class="cfg-lbl">Semana actual</div>
      <div style="display:flex;gap:10px;margin-bottom:20px">
        <div class="input-group" style="flex:1">
          <label>Número (1–14)</label>
          <input type="number" v-model="weekInput" min="1" max="14">
        </div>
        <div style="display:flex;align-items:flex-end">
          <button class="btn btn-primary" style="margin:0;padding:12px 20px;width:auto" @click="saveWeek">Guardar</button>
        </div>
      </div>

      <div class="cfg-lbl">JSON de ejercicios</div>
      <textarea v-model="exInput" rows="5" spellcheck="false"></textarea>

      <div class="cfg-lbl" style="margin-top:12px">JSON de progresión</div>
      <textarea v-model="progInput" rows="5" spellcheck="false"></textarea>

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
input[type=number] { background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 16px; padding: 12px; width: 100%; }
input:focus { outline: none; border-color: var(--accent); }
.btn { display: block; width: 100%; padding: 14px; border-radius: var(--r2); border: none; font-size: 15px; font-weight: 600; cursor: pointer; transition: all .2s; text-align: center; }
.btn-primary { background: var(--accent); color: #fff; }
.btn-secondary { background: transparent; color: var(--text); border: 1px solid var(--border2); }
.btn-danger { background: #2a1a1a; color: var(--red); border: 1px solid #3a2222; }
.msg { padding: 10px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 10px; }
.msg.ok { background: #0d2a1f; color: var(--green); border: 1px solid #1a4a35; }
.msg.err { background: #2a0d0d; color: var(--red); border: 1px solid #4a1a1a; }
</style>
