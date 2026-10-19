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

function playTone(ctx: AudioContext, freq: number, startTime: number, duration: number, peak = 0.2, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(peak, startTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.02)
}

export function playCountdownBeep() {
  const ctx = getContext()
  if (!ctx) return
  configureAudioSession()
  playTone(ctx, 1000, ctx.currentTime, 0.17, 0.85, 'square')
}

export function playRestDoneChime() {
  const ctx = getContext()
  if (!ctx) return
  configureAudioSession()
  const now = ctx.currentTime
  playTone(ctx, 523.25, now, 0.2, 0.7, 'triangle')
  playTone(ctx, 659.25, now + 0.12, 0.2, 0.75, 'triangle')
  playTone(ctx, 783.99, now + 0.24, 0.36, 0.9, 'triangle')
}
