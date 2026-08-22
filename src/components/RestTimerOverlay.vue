<script setup lang="ts">
import { computed } from 'vue'
import { XIcon, PlusIcon, MinusIcon, CheckIcon } from 'lucide-vue-next'
import { restTimerState, addRestTime, dismissRestTimer } from '../services/restTimer'
import { haptic } from '../services/haptics'

const mm = computed(() => Math.floor(restTimerState.remainingSec / 60))
const ss = computed(() => String(restTimerState.remainingSec % 60).padStart(2, '0'))

const RADIUS = 120
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const dashOffset = computed(() => {
  if (restTimerState.totalSec <= 0) return 0
  const pct = restTimerState.remainingSec / restTimerState.totalSec
  return CIRCUMFERENCE * (1 - pct)
})

function addTime(delta: number) {
  haptic('light')
  addRestTime(delta)
}

function dismiss() {
  haptic('light')
  dismissRestTimer()
}
</script>

<template>
  <Transition name="rest-fs">
    <div v-if="restTimerState.active" class="rest-fs" :class="{ finished: restTimerState.finished }">
      <button type="button" class="rest-fs-close" @click="dismiss"><XIcon /></button>

      <div class="rest-fs-body">
        <div class="rest-fs-label">{{ restTimerState.finished ? '¡Descanso terminado!' : 'Descansando' }}</div>
        <div class="rest-fs-sub" v-if="restTimerState.label">{{ restTimerState.label }}</div>

        <div class="rest-fs-ring">
          <svg viewBox="0 0 260 260" class="ring-svg">
            <circle class="ring-bg" cx="130" cy="130" r="120" />
            <circle
              v-if="!restTimerState.finished"
              class="ring-progress"
              cx="130" cy="130" r="120"
              :stroke-dasharray="CIRCUMFERENCE"
              :stroke-dashoffset="dashOffset"
            />
          </svg>
          <div class="rest-fs-time" v-if="!restTimerState.finished">{{ mm }}:{{ ss }}</div>
          <div class="rest-fs-check" v-else><CheckIcon /></div>
        </div>

        <div v-if="!restTimerState.finished" class="rest-fs-actions">
          <button type="button" class="rest-fs-adjust" @click="addTime(-15)"><MinusIcon /> 15s</button>
          <button type="button" class="rest-fs-adjust" @click="addTime(15)"><PlusIcon /> 15s</button>
        </div>

        <button type="button" class="rest-fs-skip" @click="dismiss">
          {{ restTimerState.finished ? 'Continuar' : 'Saltar descanso' }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.rest-fs {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  padding: 24px;
  padding-top: calc(24px + env(safe-area-inset-top, 0px));
  padding-bottom: calc(28px + env(safe-area-inset-bottom, 0px));
}
.rest-fs::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 65%);
  pointer-events: none;
}
.rest-fs-close {
  position: absolute;
  top: calc(20px + env(safe-area-inset-top, 0px));
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--bg3);
  color: var(--text2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform .1s;
}
.rest-fs-close:active { transform: scale(0.9); }
.rest-fs-close :deep(svg) { width: 18px; height: 18px; }

.rest-fs-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 380px;
  width: 100%;
  margin: auto 0;
}
.rest-fs-label { font-size: 15px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 1px; }
.rest-fs-sub { font-size: 20px; font-weight: 700; color: var(--text); text-transform: capitalize; margin-top: 4px; text-align: center; }

.rest-fs-ring { position: relative; width: clamp(180px, 45vh, 260px); height: clamp(180px, 45vh, 260px); margin: clamp(16px, 4vh, 36px) 0; flex-shrink: 0; }
.ring-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: var(--bg3); stroke-width: 14; }
.ring-progress {
  fill: none;
  stroke: var(--accent2);
  stroke-width: 14;
  stroke-linecap: round;
  transition: stroke-dashoffset .25s linear;
}
.rest-fs-time {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(38px, 11vh, 56px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  letter-spacing: -1px;
}
.rest-fs-check {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--green);
  animation: pop-in .35s cubic-bezier(.32,1.5,.5,1);
}
.rest-fs-check :deep(svg) { width: clamp(70px, 20vh, 110px); height: clamp(70px, 20vh, 110px); stroke-width: 1.5; }

.rest-fs-actions { display: flex; gap: 14px; margin-bottom: clamp(16px, 3vh, 28px); }
.rest-fs-adjust {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg3);
  border: none;
  color: var(--text);
  font-size: 15px;
  font-weight: 700;
  border-radius: 999px;
  padding: 12px 22px;
  cursor: pointer;
  transition: transform .1s;
}
.rest-fs-adjust :deep(svg) { width: 15px; height: 15px; }
.rest-fs-adjust:active { transform: scale(0.92); }

.rest-fs-skip {
  background: none;
  border: none;
  color: var(--accent2);
  font-size: 15px;
  font-weight: 600;
  padding: 10px;
  cursor: pointer;
}
.finished .rest-fs-skip {
  background: var(--accent);
  color: var(--accent-text);
  border-radius: 999px;
  padding: 14px 32px;
  font-weight: 700;
}

.rest-fs-enter-active, .rest-fs-leave-active { transition: opacity .25s, transform .25s; }
.rest-fs-enter-from, .rest-fs-leave-to { opacity: 0; transform: scale(1.02); }

@keyframes pop-in {
  from { transform: scale(0.6); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
