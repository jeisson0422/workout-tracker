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

// --- Reproducción con elementos <audio> ---
// Web Audio en iOS queda "muerto" tras el primer sonido con la sesión 'transient' y solo
// revive al volver a la app. Un elemento <audio> desbloqueado por un gesto puede
// reproducirse luego sin gestos, así que los avisos se renderizan a WAV y se reproducen
// con él; Web Audio queda como respaldo.
interface Note { freq: number; start: number; dur: number; peak: number; type: 'square' | 'triangle' }

function renderWav(notes: Note[], rate = 22050): string {
  const total = Math.ceil((Math.max(...notes.map(n => n.start + n.dur)) + 0.05) * rate)
  const data = new Float32Array(total)
  for (const n of notes) {
    const first = Math.floor(n.start * rate)
    const len = Math.floor(n.dur * rate)
    const hold = n.dur * 0.5
    for (let i = 0; i < len && first + i < total; i++) {
      const t = i / rate
      let env: number
      if (t < 0.02) env = (t / 0.02) * n.peak
      else if (t < hold) env = n.peak
      else env = n.peak * Math.pow(0.001 / n.peak, (t - hold) / (n.dur - hold))
      const phase = Math.sin(2 * Math.PI * n.freq * t)
      const wave = n.type === 'square' ? (phase >= 0 ? 1 : -1) : (2 / Math.PI) * Math.asin(phase)
      data[first + i] += wave * env
    }
  }
  let max = 0
  for (const v of data) max = Math.max(max, Math.abs(v))
  const gain = max > 0 ? 0.95 / max : 1
  const buf = new ArrayBuffer(44 + total * 2)
  const view = new DataView(buf)
  const str = (o: number, t: string) => { for (let i = 0; i < t.length; i++) view.setUint8(o + i, t.charCodeAt(i)) }
  str(0, 'RIFF'); view.setUint32(4, 36 + total * 2, true); str(8, 'WAVE'); str(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  str(36, 'data'); view.setUint32(40, total * 2, true)
  for (let i = 0; i < total; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i] * gain)) * 32767, true)
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}

const BEEP_NOTES: Note[] = [{ freq: 1000, start: 0, dur: 0.17, peak: 0.85, type: 'square' }]
const CHIME_NOTES: Note[] = [
  { freq: 523.25, start: 0, dur: 0.2, peak: 0.7, type: 'triangle' },
  { freq: 659.25, start: 0.12, dur: 0.2, peak: 0.75, type: 'triangle' },
  { freq: 783.99, start: 0.24, dur: 0.36, peak: 0.9, type: 'triangle' }
]

let beepEl: HTMLAudioElement | null = null
let chimeEl: HTMLAudioElement | null = null

function getElements(): HTMLAudioElement[] {
  if (typeof Audio === 'undefined') return []
  try {
    if (!beepEl) { beepEl = new Audio(renderWav(BEEP_NOTES)); beepEl.preload = 'auto' }
    if (!chimeEl) { chimeEl = new Audio(renderWav(CHIME_NOTES)); chimeEl.preload = 'auto' }
  } catch {
    return []
  }
  return [beepEl, chimeEl]
}

// Reproduce en silencio dentro de un gesto para que iOS permita reproducir luego sin gestos.
// Solo se repite si aún no está desbloqueado (o tras volver a la app) y nunca pausa un
// aviso que ya empezó a sonar: si el elemento ya no está silenciado, se deja tal cual.
let elementsUnlocked = false

function unlockElements() {
  if (elementsUnlocked) return
  const els = getElements()
  if (!els.length) return
  elementsUnlocked = true
  for (const el of els) {
    if (!el.paused) continue
    el.muted = true
    el.play().then(() => {
      if (el.muted) { el.pause(); el.currentTime = 0; el.muted = false }
    }).catch(() => { el.muted = false; elementsUnlocked = false })
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', unlockElements)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') elementsUnlocked = false
  })
}

async function playElement(el: HTMLAudioElement | null): Promise<boolean> {
  if (!el) return false
  try {
    el.muted = false
    el.currentTime = 0
    await el.play()
    return true
  } catch {
    return false
  }
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
  configureAudioSession()
  getElements()
  if (await playElement(beepEl)) return
  const ctx = await ensureRunning()
  if (!ctx) return
  configureAudioSession()
  playTone(ctx, 1000, ctx.currentTime, 0.17, 0.85, 'square')
}

export async function playRestDoneChime() {
  configureAudioSession()
  getElements()
  if (await playElement(chimeEl)) return
  const ctx = await ensureRunning()
  if (!ctx) return
  configureAudioSession()
  const now = ctx.currentTime
  playTone(ctx, 523.25, now, 0.2, 0.7, 'triangle')
  playTone(ctx, 659.25, now + 0.12, 0.2, 0.75, 'triangle')
  playTone(ctx, 783.99, now + 0.24, 0.36, 0.9, 'triangle')
}
