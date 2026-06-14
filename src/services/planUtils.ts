import { dbService } from './localDb'
import { DEFAULT_EXERCISES, DEFAULT_PROGRESSION } from '../stores/defaultData'

export function injectDefaultPlan(): string {
  const planId = crypto.randomUUID()
  dbService.run("INSERT INTO plans (id, name, is_active, synced, deleted) VALUES (?, ?, 1, 0, 0)", [planId, 'Plan Inicial'])

  const days = DEFAULT_EXERCISES.training_days || []
  days.forEach((day: any, i: number) => {
    const dayId = crypto.randomUUID()
    dbService.run("INSERT INTO training_days (id, plan_id, day_number, session_name, synced, deleted) VALUES (?, ?, ?, ?, 0, 0)",
      [dayId, planId, day.day_number || i + 1, day.session_name || "Día " + (i + 1)])

    ;(day.exercises || []).forEach((ex: any, ei: number) => {
      const exId = crypto.randomUUID()
      dbService.run(`INSERT INTO plan_exercises (
        id, training_day_id, exercise_name, exercise_type, sets, reps, rest_seconds, order_index, special_notes,
        current_weight_kg, max_safety_limit_kg, tempo, group_id, group_type, duration_min, duration_sec,
        incline_pct, speed_kmh, target_heart_rate_bpm, intensity_mode, synced, deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
        [
          exId, dayId, ex.exercise_name, ex.exercise_type || 'strength', ex.sets || 0, ex.reps || 0, ex.rest_seconds || 60, ei, ex.special_notes || '',
          ex.current_weight_kg || null, ex.max_safety_limit_kg || null, ex.tempo || null, ex.group_id || null, ex.group_type || null,
          ex.duration_min || ex.duration_minutes || null, ex.duration_sec || null, ex.incline_pct || null, ex.speed_kmh || null,
          ex.target_heart_rate_bpm || null, ex.intensity_mode || null
        ]
      )
    })
  })

  const progs = DEFAULT_PROGRESSION.progression_data || []
  progs.forEach((prog: any) => {
    const progId = crypto.randomUUID()
    dbService.run("INSERT INTO plan_progressions (id, plan_id, week_number, phase, weight_change_pct, reps_change, rpe_target, system_focus, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)",
      [progId, planId, prog.week_number, prog.phase, prog.weight_change_pct, prog.reps_change, prog.rpe_target, prog.system_focus]
    )
  })

  return planId
}

export function getSyncNowDate(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19)
}
