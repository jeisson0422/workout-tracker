<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePlansStore } from '../stores/plans'
import { useUserStore } from '../stores/user'
import { useWorkoutStore } from '../stores/workout'
import { generateMasterPrompt } from '../services/aiPrompt'
import { getSwalSettings } from '../services/swalHelper'
import Swal from 'sweetalert2'

const plansStore = usePlansStore()
const userStore = useUserStore()
const workoutStore = useWorkoutStore()
const router = useRouter()

const showNewPlanModal = ref(false)
const showAiModal = ref(false)
const showImportModal = ref(false)
const newPlanName = ref('')
const aiJsonInput = ref('')

function createPlan() {
  if (!newPlanName.value.trim()) return
  const id = plansStore.createPlan(newPlanName.value.trim())
  newPlanName.value = ''
  showNewPlanModal.value = false
  router.push(`/plans/${id}`)
}

async function deletePlan(id: string) {
  const result = await Swal.fire({
    ...getSwalSettings('danger'),
    title: '¿Eliminar plan?',
    text: "Esta acción no se puede deshacer.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar'
  })

  if (result.isConfirmed) {
    plansStore.deletePlan(id)
  }
}

async function copyAiPrompt() {
  await userStore.loadProfile()
  const prompt = generateMasterPrompt()

  try {
    await navigator.clipboard.writeText(prompt)
    window.open('https://claude.ai/new', '_blank')
    Swal.fire({
      ...getSwalSettings('success'),
      title: '¡Prompt Copiado!',
      text: 'Pégalo en Claude para generar tu plan.',
      icon: 'success',
      timer: 2000
    })
    showAiModal.value = false
  } catch (err) {
    Swal.fire({ ...getSwalSettings('danger'), title: 'Error', text: 'No se pudo copiar al portapapeles', icon: 'error' })
  }
}

async function duplicatePlan(id: string) {
  plansStore.duplicatePlan(id)
}

async function handleActivate(id: string) {
  const { errors, warnings } = plansStore.validatePlan(id)

  if (errors.length > 0) {
    await Swal.fire({
      ...getSwalSettings('danger'),
      title: 'No se puede activar',
      html: errors.map(e => `• ${e}`).join('<br>'),
      icon: 'error'
    })
    return
  }

  if (warnings.length > 0) {
    const result = await Swal.fire({
      ...getSwalSettings('warning'),
      title: '¿Activar de todos modos?',
      html: warnings.map(w => `• ${w}`).join('<br>'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Activar de todos modos'
    })
    if (!result.isConfirmed) return
  }

  plansStore.setActivePlan(id)
  workoutStore.loadConfig()
}

function cleanJsonInput(raw: string): string {
  return raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim()
}

async function pasteFromClipboard() {
  try {
    aiJsonInput.value = await navigator.clipboard.readText()
  } catch (err) {
    Swal.fire({ ...getSwalSettings('danger'), title: 'Error', text: 'No se pudo leer el portapapeles. Pégalo manualmente.', icon: 'error' })
  }
}

function importPlan() {
  let data: any
  try {
    data = JSON.parse(cleanJsonInput(aiJsonInput.value))
  } catch (err: any) {
    Swal.fire({
      ...getSwalSettings('danger'),
      title: 'JSON inválido',
      text: 'El texto pegado no es JSON válido. Revisa que copiaste la respuesta completa, sin texto extra antes o después.',
      icon: 'error'
    })
    return
  }

  try {
    const id = plansStore.importFullPlan(data)
    aiJsonInput.value = ''
    showImportModal.value = false
    Swal.fire({ ...getSwalSettings('success'), title: '¡Éxito!', text: 'Plan importado correctamente', icon: 'success' })
    router.push(`/plans/${id}`)
  } catch (err: any) {
    Swal.fire({
      ...getSwalSettings('danger'),
      title: 'Error de Importación',
      text: err.message || 'El JSON no es válido o está incompleto.',
      icon: 'error'
    })
  }
}
</script>

<template>
  <div class="pb-6">
    <div style="padding:calc(24px + env(safe-area-inset-top,0px)) 20px 10px; display: flex; align-items: center; gap: 10px;">
      <button class="back-btn" @click="router.push('/config')">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <div>
        <div style="font-size:12px;color:var(--text2);font-weight:600;letter-spacing:.5px">MIS RUTINAS</div>
        <div style="font-size:28px;font-weight:800;letter-spacing:-.5px;margin-top:4px">Planes</div>
      </div>
    </div>
    
    <div style="padding:12px 16px">
      <div v-if="plansStore.plans.length === 0" style="text-align: center; color: var(--text2); padding: 40px 0;">
        No tienes ningún plan creado.
      </div>
      
      <div class="plan-card" v-for="plan in plansStore.plans" :key="plan.id" :class="{ active: plan.is_active }">
        <div class="plan-header" @click="router.push(`/plans/${plan.id}`)">
          <div class="plan-title">{{ plan.name }}</div>
          <div class="plan-badge" v-if="plan.is_active">Activo</div>
        </div>
        <div class="plan-actions">
          <button class="btn btn-secondary btn-sm" v-if="!plan.is_active" @click="handleActivate(plan.id)">Activar</button>
          <button class="btn btn-secondary btn-sm" @click="router.push(`/plans/${plan.id}`)">Editar</button>
          <button class="btn btn-secondary btn-sm" @click="duplicatePlan(plan.id)">Duplicar</button>
          <button class="btn btn-danger btn-sm" @click="deletePlan(plan.id)">Borrar</button>
        </div>
      </div>

      <div class="ai-box">
        <div class="ai-box-title">🤖 Generación con IA</div>
        <div class="ai-box-desc">Usa el poder de Claude para crear planes basados en tu perfil y equipo.</div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-ai" style="flex:1" @click="showAiModal = true">Obtener Prompt</button>
          <button class="btn btn-ai-alt" style="flex:1" @click="showImportModal = true">Importar JSON</button>
        </div>
      </div>

      <button class="btn btn-primary" style="margin-top: 20px;" @click="showNewPlanModal = true">+ Crear Nuevo Plan Manual</button>
    </div>

    <!-- Modal AI Prompt -->
    <div v-if="showAiModal" class="modal-overlay">
      <div class="modal-content ai-modal">
        <h3>Prompt para Claude</h3>
        <p style="font-size: 13px; color: var(--text2); margin-bottom: 15px;">
          Copia este prompt y pégalo en Claude. La IA generará un plan basado en tu perfil (peso, equipo, metas).
        </p>
        <div class="prompt-preview">
          {{ generateMasterPrompt() }}
        </div>
        <div style="display:flex;gap:10px;margin-top:20px;">
          <button class="btn btn-secondary" @click="showAiModal = false">Cerrar</button>
          <button class="btn btn-ai" @click="copyAiPrompt">Copiar y Abrir Claude</button>
        </div>
      </div>
    </div>

    <!-- Modal Import -->
    <div v-if="showImportModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Importar Plan de IA</h3>
        <p style="font-size: 13px; color: var(--text2); margin-bottom: 10px;">Pega aquí el código JSON que generó Claude:</p>
        <button class="btn btn-secondary btn-sm" style="margin-bottom: 10px;" @click="pasteFromClipboard">📋 Pegar desde portapapeles</button>
        <textarea v-model="aiJsonInput" placeholder='{ "name": "Mi Plan...", "training_days": [...] }' class="import-area"></textarea>
        <div style="display:flex;gap:10px;margin-top:20px;">
          <button class="btn btn-secondary" @click="showImportModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="importPlan">Importar Plan</button>
        </div>
      </div>
    </div>

    <!-- Modal Nuevo Plan -->
    <div v-if="showNewPlanModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Nuevo Plan</h3>
        <input type="text" v-model="newPlanName" placeholder="Nombre del plan (ej. Volumen 2024)" class="modal-input" @keyup.enter="createPlan" />
        <div style="display:flex;gap:10px;margin-top:20px;">
          <button class="btn btn-secondary" @click="showNewPlanModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="createPlan">Crear</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.back-btn { background: var(--bg2); border: 1px solid var(--card-border); box-shadow: var(--card-shadow); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: var(--text); cursor: pointer; padding: 0; transition: transform .1s; }
.back-btn:active { transform: scale(0.9); }
.plan-card { background: var(--bg2); border: 1px solid var(--card-border); box-shadow: var(--card-shadow); border-radius: var(--r2); padding: 16px; margin-bottom: 12px; transition: border-color 0.2s; }
.plan-card.active { border-color: var(--accent); background: linear-gradient(180deg, rgba(200,255,0,0.05) 0%, rgba(200,255,0,0) 100%), var(--bg2); }
.plan-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; cursor: pointer; }
.plan-title { font-size: 18px; font-weight: 700; color: var(--text); }
.plan-badge { background: var(--accent); color: var(--accent-text); font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; }
.plan-actions { display: flex; gap: 8px; }
.btn { width: 100%; padding: 14px; border-radius: var(--r2); border: none; font-size: 15px; font-weight: 600; cursor: pointer; transition: transform .1s, opacity .2s; text-align: center; }
.btn:active { transform: scale(0.97); }
.btn-primary { background: var(--accent); color: var(--accent-text); }
.btn-secondary { background: var(--bg3); color: var(--text); border: 1px solid var(--border); }
.btn-danger { background: var(--danger-bg); color: var(--red); border: 1px solid var(--danger-border); }
.btn-sm { padding: 8px 12px; font-size: 13px; border-radius: 999px; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.4); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; animation: fade-in .2s ease-out; }
.modal-content { background: var(--bg2); padding: 8px 20px 24px; border-radius: var(--r) var(--r) 0 0; width: 100%; max-width: 430px; box-shadow: 0 -8px 40px rgba(0,0,0,.2); padding-bottom: calc(24px + env(safe-area-inset-bottom,0px)); animation: sheet-up .28s cubic-bezier(.32,.72,0,1); }
.modal-content::before { content: ''; display: block; width: 36px; height: 5px; border-radius: 3px; background: var(--border2); margin: 0 auto 16px; opacity: .6; }
.modal-content h3 { margin: 0 0 16px 0; font-size: 18px; text-align: center; }
.modal-input { width: 100%; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r3); color: var(--text); padding: 12px; font-size: 16px; box-sizing: border-box; }
.modal-input:focus { outline: none; border-color: var(--accent); }
@keyframes sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

.ai-box { background: linear-gradient(135deg, rgba(200,255,0,0.1) 0%, rgba(200,255,0,0) 100%); border: 1px dashed var(--accent); padding: 16px; border-radius: var(--r2); margin-top: 24px; }
.ai-box-title { font-weight: 800; font-size: 14px; margin-bottom: 4px; color: var(--accent); }
.ai-box-desc { font-size: 12px; color: var(--text2); margin-bottom: 12px; }
.btn-ai { background: var(--accent); color: var(--accent-text); font-size: 13px; padding: 10px; }
.btn-ai-alt { background: var(--bg3); color: var(--accent); border: 1px solid var(--accent); font-size: 13px; padding: 10px; }

.ai-modal { max-width: 500px !important; }
.prompt-preview { background: var(--bg3); padding: 12px; border-radius: var(--r3); font-size: 11px; font-family: monospace; height: 200px; overflow-y: auto; color: var(--text2); border: 1px solid var(--border); white-space: pre-wrap; }
.import-area { width: 100%; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r3); color: var(--text); padding: 12px; font-size: 12px; font-family: monospace; height: 200px; resize: none; }
</style>
