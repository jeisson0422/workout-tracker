<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePlansStore } from '../stores/plans'
import Swal from 'sweetalert2'

const plansStore = usePlansStore()
const router = useRouter()

const showNewPlanModal = ref(false)
const newPlanName = ref('')

function createPlan() {
  if (!newPlanName.value.trim()) return
  const id = plansStore.createPlan(newPlanName.value.trim())
  newPlanName.value = ''
  showNewPlanModal.value = false
  router.push(`/plans/${id}`)
}

async function deletePlan(id: string) {
  const result = await Swal.fire({
    title: '¿Eliminar plan?',
    text: "Esta acción no se puede deshacer.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ff4444',
    cancelButtonColor: '#333333',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    background: '#1a1a1a',
    color: '#ffffff'
  })

  if (result.isConfirmed) {
    plansStore.deletePlan(id)
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
          <button class="btn btn-secondary btn-sm" v-if="!plan.is_active" @click="plansStore.setActivePlan(plan.id)">Activar</button>
          <button class="btn btn-secondary btn-sm" @click="router.push(`/plans/${plan.id}`)">Editar</button>
          <button class="btn btn-danger btn-sm" @click="deletePlan(plan.id)">Borrar</button>
        </div>
      </div>

      <button class="btn btn-primary" style="margin-top: 20px;" @click="showNewPlanModal = true">+ Crear Nuevo Plan</button>
    </div>

    <!-- Modal Nuevo Plan -->
    <div v-if="showNewPlanModal" class="modal-overlay" @click.self="showNewPlanModal = false">
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
.back-btn { background: var(--bg2); border: 1px solid var(--border); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: var(--text); cursor: pointer; padding: 0; }
.plan-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r2); padding: 16px; margin-bottom: 12px; transition: border-color 0.2s; }
.plan-card.active { border-color: var(--accent); background: linear-gradient(180deg, rgba(200,255,0,0.05) 0%, rgba(200,255,0,0) 100%), var(--bg2); }
.plan-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; cursor: pointer; }
.plan-title { font-size: 18px; font-weight: 700; color: var(--text); }
.plan-badge { background: var(--accent); color: #000; font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; }
.plan-actions { display: flex; gap: 8px; }
.btn { width: 100%; padding: 14px; border-radius: var(--r2); border: none; font-size: 15px; font-weight: 600; cursor: pointer; transition: all .2s; text-align: center; }
.btn-primary { background: var(--accent); color: #000; }
.btn-secondary { background: var(--bg3); color: var(--text); border: 1px solid var(--border); }
.btn-danger { background: #2a1a1a; color: var(--red); border: 1px solid #3a2222; }
.btn-sm { padding: 8px 12px; font-size: 13px; border-radius: 8px; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal-content { background: var(--bg); padding: 24px; border-radius: var(--r2); width: 100%; max-width: 400px; border: 1px solid var(--border); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
.modal-content h3 { margin: 0 0 16px 0; font-size: 20px; }
.modal-input { width: 100%; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 12px; font-size: 16px; box-sizing: border-box; }
.modal-input:focus { outline: none; border-color: var(--accent); }
</style>
