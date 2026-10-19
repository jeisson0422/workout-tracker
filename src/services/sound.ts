let audioCtx: AudioContext | null = null

// 'mix' = tipo 'transient' (aviso corto por encima de la música, sin pausarla).
// 'interrupt' = tipo 'playback' (suena siempre, pero iOS puede pausar la música).
export type TimerSoundMode = 'mix' | 'interrupt'
const MODE_KEY = 'timer_sound_mode'

export function getTimerSoundMode(): TimerSoundMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'interrupt' ? 'interrupt' : 'mix'
  } catch {
    return 'mix'
  }
}

export function setTimerSoundMode(mode: TimerSoundMode) {
  try { localStorage.setItem(MODE_KEY, mode) } catch {}
  configureAudioSession()
}

function configureAudioSession() {
  if ('audioSession' in navigator) {
    try {
      (navigator as any).audioSession.type = getTimerSoundMode() === 'mix' ? 'transient' : 'playback'
    } catch {}
  }
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || (window as any).webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) {
    audioCtx = new Ctx()
    configureAudioSession()
  }
  return audioCtx
}

export function unlockAudio() {
  const ctx = getContext()
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', unlockAudio)
}

// Tono con envolvente plana (ataque y salida cortos, sin decaimiento) para que
// mantenga el volumen máximo durante toda su duración y se oiga sobre la música.
// Las notas de una secuencia no se solapan para que no se sumen y saturen.
function playTone(ctx: AudioContext, freq: number, startTime: number, duration: number, peak = 0.95) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(peak, startTime + 0.004)
  gain.gain.setValueAtTime(peak, startTime + duration - 0.015)
  gain.gain.linearRampToValueAtTime(0, startTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.02)
}

export function playCountdownBeep() {
  const ctx = getContext()
  if (!ctx) return
  configureAudioSession()
  playTone(ctx, 1600, ctx.currentTime, 0.18)
}

export function playRestDoneChime() {
  const ctx = getContext()
  if (!ctx) return
  configureAudioSession()
  const now = ctx.currentTime
  const notes = [1318.5, 1568, 2093]
  for (const offset of [0, 0.7]) {
    notes.forEach((f, i) => playTone(ctx, f, now + offset + i * 0.2, 0.18))
  }
}
