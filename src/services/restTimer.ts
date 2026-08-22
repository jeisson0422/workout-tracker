import { reactive } from 'vue'
import { haptic } from './haptics'

interface RestTimerState {
  active: boolean
  finished: boolean
  label: string
  totalSec: number
  endsAt: number
  remainingSec: number
}

export const restTimerState = reactive<RestTimerState>({
  active: false,
  finished: false,
  label: '',
  totalSec: 0,
  endsAt: 0,
  remainingSec: 0
})

let intervalId: ReturnType<typeof setInterval> | null = null
let autoDismissId: ReturnType<typeof setTimeout> | null = null
let wakeLock: any = null

function stopInterval() {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}

async function acquireWakeLock() {
  try {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      wakeLock = await (navigator as any).wakeLock.request('screen')
    }
  } catch {
    wakeLock = null
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release?.().catch(() => {})
    wakeLock = null
  }
}

function clearAutoDismiss() {
  if (autoDismissId !== null) {
    clearTimeout(autoDismissId)
    autoDismissId = null
  }
}

function tick() {
  if (!restTimerState.active) return
  const remaining = Math.max(0, Math.round((restTimerState.endsAt - Date.now()) / 1000))
  restTimerState.remainingSec = remaining
  if (remaining <= 0 && !restTimerState.finished) {
    restTimerState.finished = true
    haptic('success')
    stopInterval()
    clearAutoDismiss()
    autoDismissId = setTimeout(dismissRestTimer, 6000)
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    tick()
    if (document.visibilityState === 'visible' && restTimerState.active && !wakeLock) {
      acquireWakeLock()
    }
  })
}

export function startRestTimer(seconds: number, label = '') {
  if (!seconds || seconds <= 0) return
  clearAutoDismiss()
  restTimerState.active = true
  restTimerState.finished = false
  restTimerState.label = label
  restTimerState.totalSec = seconds
  restTimerState.endsAt = Date.now() + seconds * 1000
  restTimerState.remainingSec = seconds
  stopInterval()
  intervalId = setInterval(tick, 250)
  acquireWakeLock()
}

export function addRestTime(deltaSec: number) {
  if (!restTimerState.active) return
  restTimerState.endsAt += deltaSec * 1000
  restTimerState.totalSec = Math.max(restTimerState.totalSec + deltaSec, 1)
  if (restTimerState.finished && restTimerState.endsAt > Date.now()) {
    clearAutoDismiss()
    restTimerState.finished = false
    stopInterval()
    intervalId = setInterval(tick, 250)
  }
  tick()
}

export function dismissRestTimer() {
  restTimerState.active = false
  restTimerState.finished = false
  stopInterval()
  clearAutoDismiss()
  releaseWakeLock()
}
