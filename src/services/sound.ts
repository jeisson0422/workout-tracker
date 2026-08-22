let audioCtx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || (window as any).webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) {
    audioCtx = new Ctx()
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
  const unlock = () => {
    unlockAudio()
    document.removeEventListener('pointerdown', unlock)
  }
  document.addEventListener('pointerdown', unlock)
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
  playTone(ctx, 1000, ctx.currentTime, 0.17, 0.85, 'square')
}

export function playRestDoneChime() {
  const ctx = getContext()
  if (!ctx) return
  const now = ctx.currentTime
  playTone(ctx, 523.25, now, 0.2, 0.7, 'triangle')
  playTone(ctx, 659.25, now + 0.12, 0.2, 0.75, 'triangle')
  playTone(ctx, 783.99, now + 0.24, 0.36, 0.9, 'triangle')
}
