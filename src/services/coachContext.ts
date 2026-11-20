// Arma, desde Supabase, un texto con tu entrenamiento y tu nutrición para pegarlo en un chat de Claude.
// Todo se consulta al momento de copiar (con tu sesión, bajo RLS), así que siempre está al día.
// El plan de comidas sale de src/nutrition/plan.ts con la configuración guardada en Supabase.

import { supabase } from './supabase'
import { showToast } from './toast'
import { haptic } from './haptics'
import { getSwalSettings, swalInstance } from './swalHelper'
import { useUserStore } from '../stores/user'
import { isoDate, weekdayIndex } from '../stores/nutrition'
import {
  buildDay, eatenTotal, mealTotal, skipKey, DEFAULT_GYM_DAYS, DAY_NAMES, TARGETS, PACE_LABEL,
  ENERGY_REFERENCES, RULES, RAISE_CALORIES_WHEN, PHASE_TIPS, type Pace, type DinnerKind, type DayPlan
} from '../nutrition/plan'
import { FOODS } from '../nutrition/foods'
import { weeklyAverages, paceAdvice } from '../nutrition/advice'

const DAY_MS = 24 * 60 * 60 * 1000

// ---------- Datos ----------

interface ExerciseRow {
  exercise_name: string; exercise_type: string | null; sets: number | null; reps: number | null
  rest_seconds: number | null; order_index: number | null; special_notes: string | null
  current_weight_kg: number | null; tempo: string | null; duration_min: number | null
  incline_pct: number | null; speed_kmh: number | null; target_heart_rate_bpm: number | null
}
interface DayRow { day_number: number; session_name: string; plan_exercises: ExerciseRow[] }
interface ProgressionRow {
  week_number: number; phase: string | null; weight_change_pct: string | null
  reps_change: string | null; rpe_target: number | null; system_focus: string | null
}
interface PlanRow { id: string; name: string; current_week: number; training_days: DayRow[]; plan_progressions: ProgressionRow[] }
interface SetRow { set_number: number; weight_kg: number | null; reps: number | null; rpe: number | null }
interface LogRow {
  week: number; day_label: string; exercise: string; sets: number | null; reps: number | null
  weight_kg: number | null; rpe: number | null; notes: string | null; logged_at: string; workout_log_sets: SetRow[]
}
interface StatRow { weight_kg: number; body_fat_pct: number | null; notes: string | null; recorded_at: string }
interface CheckRow { kind: 'meal' | 'skip'; period: string; item: string }

export interface CoachData {
  config: Record<string, string>
  plan: PlanRow | null
  logs: LogRow[]
  stats: StatRow[]
  checks: CheckRow[]
}

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`)
  return (res.data ?? []) as T
}

export async function fetchCoachData(now = new Date()): Promise<CoachData> {
  const since7 = isoDate(new Date(now.getTime() - 7 * DAY_MS))
  const since30 = new Date(now.getTime() - 30 * DAY_MS).toISOString()

  const [cfgRes, planRes, statsRes, checksRes] = await Promise.all([
    supabase.from('user_configs').select('key, value').in('key', ['current_week', 'nutri_pace', 'nutri_dinner', 'nutri_gym_days']),
    supabase.from('plans')
      .select('id, name, current_week, training_days(day_number, session_name, plan_exercises(*)), plan_progressions(*)')
      .eq('is_active', true),
    supabase.from('body_stats').select('weight_kg, body_fat_pct, notes, recorded_at').gte('recorded_at', since30).order('recorded_at', { ascending: false }),
    supabase.from('nutrition_checks').select('kind, period, item').in('kind', ['meal', 'skip']).eq('checked', true).gte('period', since7)
  ])

  const config = Object.fromEntries(must<{ key: string; value: string }[]>(cfgRes as any, 'configuración').map(r => [r.key, r.value]))
  const plan = must<PlanRow[]>(planRes as any, 'plan activo')[0] ?? null
  const stats = must<StatRow[]>(statsRes as any, 'peso')
  const checks = must<CheckRow[]>(checksRes as any, 'comidas')

  let logs: LogRow[] = []
  if (plan) {
    const week = parseInt(config.current_week) || plan.current_week || 1
    const logsRes = await supabase.from('workout_logs')
      .select('week, day_label, exercise, sets, reps, weight_kg, rpe, notes, logged_at, workout_log_sets(set_number, weight_kg, reps, rpe)')
      .eq('plan_id', plan.id).gte('week', Math.max(1, week - 2))
      .order('logged_at', { ascending: false }).limit(600)
    logs = must<LogRow[]>(logsRes as any, 'registros de entrenamiento')
  }
  return { config, plan, logs, stats, checks }
}

// ---------- Formato ----------

const r0 = (n: number) => Math.round(n)
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

function parseGymDays(raw: string | undefined): boolean[] {
  try {
    const p = raw ? JSON.parse(raw) : null
    if (Array.isArray(p) && p.length === 7) return p.map(Boolean)
  } catch { /* usa el valor por defecto */ }
  return [...DEFAULT_GYM_DAYS]
}

function mealLine(plan: DayPlan, mealId: string, skipped: string[]): string {
  const m = plan.meals.find(x => x.id === mealId)!
  const t = mealTotal(m, skipped)
  const what = m.libre
    ? `libre, meta ~${m.libre.kcal} kcal y al menos ${m.libre.p} g de proteína`
    : m.items.map(i => {
        const [q, d] = FOODS[i.food].label(i.qty)
        return `${q} ${d}${skipped.includes(skipKey(m.id, i.food)) ? ' (omitido)' : ''}`
      }).join('; ')
  return `- ${m.time} ${m.name} (${r0(t.kcal)} kcal, ${r0(t.p)} g P): ${what}`
}

function exerciseLine(e: ExerciseRow): string {
  const parts = [`${e.exercise_name}: ${e.sets ?? '?'}×${e.reps ?? '?'}`]
  if (e.current_weight_kg) parts.push(`@ ${e.current_weight_kg} kg`)
  if (e.duration_min) parts.push(`${e.duration_min} min`)
  if (e.incline_pct) parts.push(`inclinación ${e.incline_pct}%`)
  if (e.speed_kmh) parts.push(`${e.speed_kmh} km/h`)
  if (e.target_heart_rate_bpm) parts.push(`FC ${e.target_heart_rate_bpm}`)
  if (e.rest_seconds) parts.push(`descanso ${e.rest_seconds}s`)
  if (e.tempo) parts.push(`tempo ${e.tempo}`)
  if (e.special_notes) parts.push(`nota: ${e.special_notes}`)
  return parts.join(' · ')
}

function setsText(l: LogRow): string {
  const sets = [...(l.workout_log_sets ?? [])].sort((a, b) => a.set_number - b.set_number)
  if (sets.length) return sets.map(s => `${s.weight_kg ?? 0}×${s.reps ?? 0}${s.rpe ? '@' + s.rpe : ''}`).join(', ')
  return `${l.sets ?? '?'}×${l.reps ?? '?'} @ ${l.weight_kg ?? 0} kg${l.rpe ? ' RPE ' + l.rpe : ''}`
}

export function formatCoachContext(d: CoachData, now = new Date()): string {
  const user = useUserStore().profile
  const out: string[] = []
  const push = (...lines: string[]) => out.push(...lines)

  const pace: Pace = d.config.nutri_pace === 'agr' ? 'agr' : 'mod'
  const dinner: DinnerKind = d.config.nutri_dinner === 'arepa' ? 'arepa' : 'clasica'
  const gymDays = parseGymDays(d.config.nutri_gym_days)
  const week = parseInt(d.config.current_week) || d.plan?.current_week || 1
  const todayIdx = weekdayIndex(now)
  const today = isoDate(now)

  push(
    `# Contexto de mi plan de entrenamiento y nutrición`,
    `Generado el ${now.toLocaleString('es-CR', { dateStyle: 'full', timeStyle: 'short' })}, con datos de Supabase al momento de copiar.`,
    `Responde con base en estos datos exactos. Si algo falta o no cuadra, pregúntame antes de suponer.`, ''
  )

  // Perfil
  const latest = d.stats[0]
  push(`## Perfil`)
  const prof = [
    latest ? `peso actual ${latest.weight_kg} kg (${isoDate(new Date(latest.recorded_at))})` : '',
    latest?.body_fat_pct ? `grasa corporal ${latest.body_fat_pct}%` : '',
    user.height_cm ? `${user.height_cm} cm` : '', user.age ? `${user.age} años` : '',
    user.goal ? `objetivo: ${user.goal}` : '', user.injuries ? `lesiones: ${user.injuries}` : ''
  ].filter(Boolean)
  push(prof.length ? `- ${prof.join(' · ')}` : '- (sin datos de perfil)', '')

  // Entrenamiento
  push(`## Entrenamiento`)
  if (!d.plan) {
    push('- No hay un plan activo.', '')
  } else {
    const p = d.plan
    const progs = [...p.plan_progressions].sort((a, b) => a.week_number - b.week_number)
    const cur = progs.find(x => x.week_number === week)
    const days = [...p.training_days].sort((a, b) => a.day_number - b.day_number)
    const doneLabels = new Set(d.logs.filter(l => l.exercise === '_day_complete' && l.week === week).map(l => l.day_label))
    const next = days.find(x => !doneLabels.has(x.session_name))

    push(
      `- Plan activo: ${p.name}`,
      `- Semana ${week} de ${progs.length || '?'}${cur?.phase ? ` · fase ${cur.phase}` : ''}${cur?.rpe_target ? ` · RPE meta ${cur.rpe_target}` : ''}`
    )
    if (cur) push(`- Esta semana: peso ${cur.weight_change_pct ?? '—'}, reps ${cur.reps_change ?? '—'}, enfoque ${cur.system_focus ?? '—'}`)
    push(
      `- Sesiones completadas esta semana: ${doneLabels.size} de ${days.length}${doneLabels.size ? ` (${[...doneLabels].join('; ')})` : ''}`,
      `- Siguiente sesión del plan: ${next ? next.session_name : 'todas completas, sigue la semana siguiente'}`,
      `- Nota: el entrenamiento va por sesiones en orden, no por día del calendario. Hoy es ${DAY_NAMES[todayIdx].toLowerCase()}.`,
      ''
    )

    push(`### Rutina del plan`)
    for (const day of days) {
      push(`**${day.session_name}**`)
      for (const e of [...day.plan_exercises].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))) push(`- ${exerciseLine(e)}`)
    }
    push('', `### Progresión por semana`)
    for (const g of progs) {
      push(`- Semana ${g.week_number} (${g.phase ?? '—'}): peso ${g.weight_change_pct ?? '—'}, reps ${g.reps_change ?? '—'}, RPE ${g.rpe_target ?? '—'}, enfoque ${g.system_focus ?? '—'}${g.week_number === week ? ' ← actual' : ''}`)
    }

    push('', `### Últimos registros (serie = kg×reps@RPE, hasta 3 sesiones por ejercicio)`)
    const byExercise = new Map<string, LogRow[]>()
    for (const l of d.logs) {
      if (l.exercise === '_day_complete') continue
      byExercise.set(l.exercise, [...(byExercise.get(l.exercise) ?? []), l])
    }
    if (!byExercise.size) push('- Sin registros en las últimas 3 semanas.')
    for (const [name, list] of byExercise) {
      push(`- ${name}: ` + list.slice(0, 3).map(l => `S${l.week} ${l.day_label.split(' - ')[0]}: ${setsText(l)}`).join(' | '))
    }
    push('')
  }

  // Nutrición
  const T = TARGETS[pace]
  push(
    `## Nutrición`,
    `- Ritmo: ${PACE_LABEL[pace].toLowerCase()} · cena: ${dinner === 'arepa' ? 'con arepa de maíz y mozzarella' : 'con camote o papa'}`,
    `- Días de gym en el calendario: ${DAY_NAMES.filter((_, i) => gymDays[i]).join(', ')}`,
    `- Metas: día de gym ~${fmt(T.gym)} kcal, día de descanso ~${fmt(T.rest)} kcal, proteína ${T.prot} g`,
    `- Referencias: ${ENERGY_REFERENCES.map(e => `${e.label} ${e.text}`).join('; ')}`,
    `- Comidas: 7:30 antes de entrenar, 10:00 desayuno después del gym, 14:00 almuerzo, 17:00 merienda, 20:00 cena. Entreno a las 8.`,
    ''
  )

  const phaseKey = (d.plan?.plan_progressions.find(x => x.week_number === week)?.phase || '').toLowerCase()
  if (PHASE_TIPS[phaseKey]) push(`- Consejo de la fase: ${PHASE_TIPS[phaseKey]}`, '')

  push(`### Plan de comidas de la semana`)
  for (let i = 0; i < 7; i++) {
    const plan = buildDay(i, pace, dinner, gymDays)
    push(`**${DAY_NAMES[i]}** (${plan.gym ? 'gym' : 'descanso'}, ${fmt(plan.total.kcal)} kcal, ${r0(plan.total.p)} g P, ${r0(plan.total.c)} g C, ${r0(plan.total.f)} g G)`)
    for (const m of plan.meals) push(mealLine(plan, m.id, []))
  }

  // Seguimiento de comidas
  const logsToday = d.logs.some(l => l.exercise !== '_day_complete' && l.logged_at.startsWith(today))
  push('', `### Lo que marqué como comido (últimos 7 días)`)
  for (let back = 0; back < 7; back++) {
    const date = isoDate(new Date(now.getTime() - back * DAY_MS))
    const idx = weekdayIndex(new Date(now.getTime() - back * DAY_MS))
    const gyms = [...gymDays]
    if (date === today && logsToday) gyms[idx] = true
    const plan = buildDay(idx, pace, dinner, gyms)
    const eaten = d.checks.filter(c => c.kind === 'meal' && c.period === date).map(c => c.item)
    const skipped = d.checks.filter(c => c.kind === 'skip' && c.period === date).map(c => c.item)
    const label = `${DAY_NAMES[idx]} ${date}${back === 0 ? ' (hoy)' : ''}`
    if (!eaten.length) { push(`- ${label}: nada marcado`); continue }
    const t = eatenTotal(plan, eaten, skipped)
    push(`- ${label}: ${eaten.length} de ${plan.meals.length} comidas, ~${r0(t.kcal)} kcal y ${r0(t.p)} g de proteína (plan del día: ${fmt(plan.total.kcal)} kcal)${skipped.length ? `; omitidos: ${skipped.join(', ')}` : ''}`)
  }

  // Peso
  push('', `## Peso`)
  const avg = weeklyAverages(d.stats.map(s => ({ weight_kg: s.weight_kg, recorded_at: s.recorded_at })), now)
  if (!d.stats.length) push('- Sin registros de peso en los últimos 30 días.')
  else {
    push(`- Registros (últimos 30 días): ${d.stats.slice(0, 14).map(s => `${isoDate(new Date(s.recorded_at))} ${s.weight_kg} kg`).join('; ')}`)
    push(`- Promedio últimos 7 días: ${avg.current !== null ? avg.current.toFixed(1) + ' kg' : 'sin datos'} · 7 días anteriores: ${avg.previous !== null ? avg.previous.toFixed(1) + ' kg' : 'sin datos'}`)
    if (avg.lost !== null) {
      const a = paceAdvice(avg.lost, pace)
      push(`- Lectura automática de la app: ${a.headline}. ${a.text}`)
    }
  }

  push('', `## Reglas que sigo`, ...RULES.map(x => `- ${x}`), `- Subo calorías si: ${RAISE_CALORIES_WHEN.join(' ')}`, '')
  push(`Las calorías y macros del plan son estimaciones calculadas con las etiquetas de mis productos; se ajustan con mi peso real.`)
  return out.join('\n')
}

export async function buildCoachContext(): Promise<string> {
  const now = new Date()
  return formatCoachContext(await fetchCoachData(now), now)
}

// ---------- Copiar ----------

async function showManualCopy(text: string) {
  await swalInstance.fire({
    ...getSwalSettings(),
    title: 'Copia el contexto',
    html: `<textarea id="coach-ctx" readonly style="width:100%;height:240px;font-size:12px;padding:8px;border-radius:8px;background:transparent;color:inherit;border:1.5px solid currentColor"></textarea>`,
    confirmButtonText: 'Listo',
    showCancelButton: false,
    didOpen: () => {
      const ta = document.getElementById('coach-ctx') as HTMLTextAreaElement | null
      if (ta) { ta.value = text; ta.focus(); ta.select() }
    }
  })
}

// El portapapeles puede quedarse esperando un permiso que nunca llega: sin tope, el botón se queda colgado.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('tiempo agotado')), ms))])
}

/** Arma el contexto y lo copia. Safari exige copiar dentro del toque, por eso se pasa la promesa al portapapeles. */
export async function copyCoachContext(): Promise<void> {
  try {
    const textPromise = buildCoachContext()
    let copied = false
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await withTimeout(navigator.clipboard.write([new ClipboardItem({ 'text/plain': textPromise.then(t => new Blob([t], { type: 'text/plain' })) })]), 3000)
        copied = true
      }
    } catch { copied = false }

    const text = await textPromise
    if (!copied) {
      try { await withTimeout(navigator.clipboard.writeText(text), 1500); copied = true } catch { copied = false }
    }
    if (copied) {
      haptic('success')
      showToast(`Contexto copiado (${text.split('\n').length} líneas)`, 'success')
    } else {
      await showManualCopy(text)
    }
  } catch (e: any) {
    showToast(`No pude armar el contexto: ${e?.message ?? 'error desconocido'}`, 'error', 4000)
  }
}
