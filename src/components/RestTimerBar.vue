<script setup lang="ts">
import { computed } from 'vue'
import { XIcon, PlusIcon, CheckIcon } from 'lucide-vue-next'
import { restTimerState, addRestTime, dismissRestTimer } from '../services/restTimer'
import { haptic } from '../services/haptics'

const mm = computed(() => Math.floor(restTimerState.remainingSec / 60))
const ss = computed(() => String(restTimerState.remainingSec % 60).padStart(2, '0'))
const pct = computed(() => {
  if (restTimerState.totalSec <= 0) return 0
  return Math.min(100, Math.max(0, ((restTimerState.totalSec - restTimerState.remainingSec) / restTimerState.totalSec) * 100))
})

function addTime() {
  haptic('light')
  addRestTime(15)
}

function dismiss() {
  haptic('light')
  dismissRestTimer()
}
</script>

<template>
  <Transition name="timer-slide">
    <div v-if="restTimerState.active" class="rest-timer ios-glass" :class="{ finished: restTimerState.finished }">
      <div class="rest-progress" :style="{ width: pct + '%' }"></div>
      <div class="rest-content">
        <div class="rest-info">
          <span class="rest-icon" v-if="restTimerState.finished"><CheckIcon /></span>
          <div>
            <div class="rest-label">{{ restTimerState.finished ? '¡Descanso terminado!' : 'Descansando' }}</div>
            <div class="rest-sub" v-if="restTimerState.label">{{ restTimerState.label }}</div>
          </div>
        </div>
        <div class="rest-actions">
          <div class="rest-time" v-if="!restTimerState.finished">{{ mm }}:{{ ss }}</div>
          <button v-if="!restTimerState.finished" class="rest-btn" @click="addTime"><PlusIcon /> 15s</button>
          <button class="rest-btn rest-btn-close" @click="dismiss"><XIcon /></button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.rest-timer {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  max-width: 398px;
  margin: 0 auto;
  z-index: 150;
  border-radius: 999px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,.25), 0 1px 2px rgba(0,0,0,.06);
}
.rest-progress {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
  opacity: .22;
  transition: width .25s linear;
}
.rest-timer.finished .rest-progress {
  width: 100% !important;
  background: var(--green);
  opacity: .25;
  animation: pulse-bg 1s ease-in-out infinite;
}
.rest-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 8px 10px 14px;
}
.rest-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.rest-icon {
  display: flex;
  width: 20px;
  height: 20px;
  color: var(--green);
  flex-shrink: 0;
}
.rest-icon :deep(svg) { width: 100%; height: 100%; }
.rest-label { font-size: 13px; font-weight: 700; color: var(--text); }
.rest-sub { font-size: 11px; color: var(--text2); text-transform: capitalize; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
.rest-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.rest-time { font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--accent2); min-width: 44px; text-align: right; }
.rest-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--bg3);
  border: none;
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  padding: 7px 10px;
  cursor: pointer;
  transition: transform .1s;
}
.rest-btn :deep(svg) { width: 13px; height: 13px; }
.rest-btn:active { transform: scale(0.9); }
.rest-btn-close { padding: 7px; color: var(--text2); }

.timer-slide-enter-active, .timer-slide-leave-active {
  transition: transform .25s cubic-bezier(.32,.72,0,1), opacity .25s;
}
.timer-slide-enter-from, .timer-slide-leave-to {
  transform: translateY(16px);
  opacity: 0;
}

@keyframes pulse-bg {
  0%, 100% { opacity: .18; }
  50% { opacity: .38; }
}
</style>
