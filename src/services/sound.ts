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
      const type = getTimerSoundMode() === 'mix' ? 'transient' : 'playback'
      if ((navigator as any).audioSession.type !== type) (navigator as any).audioSession.type = type
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
  // En iOS el contexto puede quedar 'suspended' o 'interrupted' (no estándar)
  if (ctx && ctx.state !== 'running') {
    ctx.resume().catch(() => {})
  }
}

// Con la sesión 'transient' iOS corta el audio al terminar el primer sonido y deja el
// contexto suspendido o interrumpido; los avisos siguientes se programaban sobre un
// contexto que no sonaba. Antes de cada sonido se reanuda y, si no responde, se recrea.
let pendingReady: Promise<AudioContext | null> | null = null

// resume() puede quedarse pendiente sin un gesto del usuario; sin límite bloquearía
// todos los sonidos siguientes.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([p, new Promise<undefined>(resolve => setTimeout(resolve, ms))])
}

async function prepareContext(): Promise<AudioContext | null> {
  let ctx = getContext()
  if (!ctx) return null
  if (ctx.state !== 'running') {
    try { await withTimeout(ctx.resume(), 400) } catch { /* se intenta recrear abajo */ }
  }
  if (ctx.state !== 'running') {
    try { await withTimeout(ctx.close(), 300) } catch {}
    audioCtx = null
    ctx = getContext()
    try { await withTimeout(ctx?.resume() ?? Promise.resolve(), 400) } catch {}
  }
  return ctx
}

function ensureRunning(): Promise<AudioContext | null> {
  if (!pendingReady) {
    pendingReady = prepareContext().finally(() => { pendingReady = null })
  }
  return pendingReady
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
  // Mantiene el volumen la mitad del tono y recién entonces decae; con el decaimiento
  // desde el inicio casi todo el tono sonaba muy bajo.
  gain.gain.setValueAtTime(peak, startTime + duration * 0.5)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.02)
}

export async function playCountdownBeep() {
  const ctx = await ensureRunning()
  if (!ctx) return
  configureAudioSession()
  playTone(ctx, 1000, ctx.currentTime, 0.17, 0.85, 'square')
}

export async function playRestDoneChime() {
  const ctx = await ensureRunning()
  if (!ctx) return
  configureAudioSession()
  const now = ctx.currentTime
  playTone(ctx, 523.25, now, 0.2, 0.7, 'triangle')
  playTone(ctx, 659.25, now + 0.12, 0.2, 0.75, 'triangle')
  playTone(ctx, 783.99, now + 0.24, 0.36, 0.9, 'triangle')
}
