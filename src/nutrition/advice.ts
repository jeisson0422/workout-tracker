// Cálculos puros del control de peso. Sin acceso a base de datos, fáciles de probar.

import type { Pace } from './plan'

export interface WeightEntry { weight_kg: number; recorded_at: string }

export interface WeeklyAverages {
  current: number | null
  previous: number | null
  /** kg perdidos (positivo) o ganados (negativo) entre promedios. */
  lost: number | null
}

const DAY_MS = 24 * 60 * 60 * 1000

function average(values: number[]): number | null {
  if (!values.length) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Promedio de los últimos 7 días y de los 7 anteriores, contados hacia atrás desde `now`. */
export function weeklyAverages(entries: WeightEntry[], now = new Date()): WeeklyAverages {
  const end = now.getTime()
  const inRange = (from: number, to: number) =>
    entries
      .filter(e => {
        const t = new Date(e.recorded_at).getTime()
        return t > from && t <= to
      })
      .map(e => e.weight_kg)

  const current = average(inRange(end - 7 * DAY_MS, end))
  const previous = average(inRange(end - 14 * DAY_MS, end - 7 * DAY_MS))
  // Redondeo a 2 decimales para que 0.7 exacto no caiga en el otro lado del umbral por error de coma flotante.
  const lost = current !== null && previous !== null ? Math.round((previous - current) * 100) / 100 : null
  return { current, previous, lost }
}

export interface Advice { tone: 'ok' | 'warn' | 'info'; headline: string; text: string }

/** Qué hacer según los kg perdidos en la semana y el ritmo elegido. */
export function paceAdvice(lost: number, pace: Pace): Advice {
  const headline = `${lost >= 0 ? 'Bajaste' : 'Subiste'} ${Math.abs(lost).toFixed(2)} kg en la semana`
  if (lost < 0) {
    return { tone: 'warn', headline, text: 'Antes de recortar, revisa las porciones (arroz, camote, aguacate) y los pasos.' }
  }
  if (pace === 'agr') {
    if (lost < 0.5) return { tone: 'warn', headline, text: 'Vas por debajo del ritmo agresivo. Baja el arroz a 100 g, sube a 9,000 pasos o espera una semana más antes de recortar.' }
    if (lost <= 0.9) return { tone: 'ok', headline, text: 'Ritmo agresivo bien llevado. No cambies nada y vigila la fuerza en el gym.' }
    return { tone: 'warn', headline, text: 'Bajas muy rápido. Sube unas 150 a 200 kcal (arroz a 150 g y aguacate a 50 g) para cuidar el músculo.' }
  }
  if (lost < 0.3) return { tone: 'warn', headline, text: 'Vas lento. Baja el arroz a 100 g o sube a 9,000 pasos al día.' }
  if (lost <= 0.7) return { tone: 'ok', headline, text: 'Ritmo ideal. No cambies nada.' }
  return { tone: 'warn', headline, text: 'Bajas más rápido de lo planeado. Sube unas 150 kcal: arroz a 150 g y 25 g más de aguacate.' }
}
