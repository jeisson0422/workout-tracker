<script setup lang="ts">
import { CheckIcon, XIcon } from 'lucide-vue-next'
import { toastState } from '../services/toast'
</script>

<template>
  <div class="toast-host">
    <TransitionGroup name="toast">
      <div v-for="t in toastState.items" :key="t.id" class="toast ios-glass" :class="t.type">
        <span class="toast-icon" v-if="t.type === 'success'"><CheckIcon /></span>
        <span class="toast-icon" v-else-if="t.type === 'error'"><XIcon /></span>
        <span class="toast-msg">{{ t.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: calc(12px + env(safe-area-inset-top, 0px));
  left: 0;
  right: 0;
  z-index: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  padding: 0 16px;
}
.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 380px;
  width: 100%;
  padding: 12px 16px;
  border-radius: 999px;
  box-shadow: 0 8px 24px rgba(0,0,0,.2), 0 1px 2px rgba(0,0,0,.06);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.toast-icon {
  display: flex;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.toast-icon :deep(svg) { width: 100%; height: 100%; }
.toast.success .toast-icon { color: var(--green); }
.toast.error .toast-icon { color: var(--red); }
.toast-msg { flex: 1; }

.toast-enter-active, .toast-leave-active {
  transition: transform .25s cubic-bezier(.32,.72,0,1), opacity .25s;
}
.toast-enter-from { transform: translateY(-16px); opacity: 0; }
.toast-leave-to { transform: translateY(-16px); opacity: 0; }
.toast-move { transition: transform .25s; }
</style>
