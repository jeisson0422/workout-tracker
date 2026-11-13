import { defineStore } from 'pinia'
import { dbService } from '../services/localDb'
import { syncService } from '../services/syncService'
import { useUserStore } from './user'
import { useWorkoutStore } from './workout'
import { buildDay, eatenTotal, DEFAULT_GYM_DAYS, PHASE_TIPS, type DinnerKind, type Pace, type DayPlan } from '../nutrition/plan'
import { weeklyAverages, paceAdvice } from '../nutrition/advice'

// 'skip' = ingrediente omitido de una comida (item: '<idComida>:<alimento>')
export type CheckKind = 'meal' | 'shop' | 'prep' | 'skip'

// Fechas locales en formato YYYY-MM-DD (no usar toISOString: devuelve UTC).
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** 0 = lunes ... 6 = domingo. */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}
export function mondayOf(d: Date): string {
  const m = new Date(d)
  m.setHours(12, 0, 0, 0)
  m.setDate(m.getDate() - weekdayIndex(m))
  return isoDate(m)
}

/** Fecha (YYYY-MM-DD) del día `i` (0 = lunes) de la semana actual. */
export function dateOfWeekday(i: number): string {
  const d = new Date(`${mondayOf(new Date())}T12:00:00`)
  d.setDate(d.getDate() + i)
  return isoDate(d)
}

function readGymDays(): boolean[] {
  try {
    const raw = dbService.getConfig('nutri_gym_days')
    const parsed = raw ? JSON.parse(raw) : null
    if (Array.isArray(parsed) && parsed.length === 7) return parsed.map(Boolean)
  } catch { /* usa el valor por defecto */ }
  return [...DEFAULT_GYM_DAYS]
}

export const useNutritionStore = defineStore('nutrition', {
  state: () => ({
    pace: 'mod' as Pace,
    dinner: 'clasica' as DinnerKind,
    gymDays: [...DEFAULT_GYM_DAYS] as boolean[],
    /** Sube cada vez que cambian datos locales, para que los getters se recalculen. */
    tick: 0
  }),

  getters: {
    todayIso: () => isoDate(new Date()),
    todayIndex: () => weekdayIndex(new Date()),
    weekKey: () => mondayOf(new Date()),

    /** True si hoy ya registraste ejercicios, aunque el calendario diga descanso. */
    trainedToday(state): boolean {
      state.tick
      useWorkoutStore().dbUpdateTrigger
      const res = dbService.q("SELECT COUNT(*) FROM workout_log WHERE substr(logged_at, 1, 10) = ? AND exercise != '_day_complete'", [isoDate(new Date())])
      return !!res.length && res[0].values[0][0] > 0
    },

    /** Plan de hoy. Si ya entrenaste hoy, cuenta como día de gym. */
    todayPlan(state): DayPlan {
      const gymDays = [...state.gymDays]
      if (this.trainedToday) gymDays[this.todayIndex] = true
      return buildDay(this.todayIndex, state.pace, state.dinner, gymDays)
    },

    todayEaten(state): string[] {
      state.tick
      return dbService.getNutritionChecks('meal', this.todayIso)
    },

    /** Primera comida de hoy que todavía no marcas como comida. */
    nextMeal(): { time: string; name: string } | null {
      const meal = this.todayPlan.meals.find(m => !this.todayEaten.includes(m.id))
      return meal ? { time: meal.time, name: meal.name } : null
    },

    todaySkips(state): string[] {
      state.tick
      return dbService.getNutritionChecks('skip', this.todayIso)
    },

    todayProgress(): { kcal: number; p: number } {
      const t = eatenTotal(this.todayPlan, this.todayEaten, this.todaySkips)
      return { kcal: t.kcal, p: t.p }
    },

    /** Consejo según la fase de la semana de entrenamiento. */
    phaseTip(): string {
      const workout = useWorkoutStore()
      const phase = (workout.getWeekInfo(workout.currentWeek).phase || 'density').toLowerCase()
      return PHASE_TIPS[phase] || ''
    },

    weight(state) {
      state.tick
      const user = useUserStore()
      const entries = user.stats_history.map(s => ({ weight_kg: s.weight_kg, recorded_at: s.recorded_at }))
      const avg = weeklyAverages(entries)
      return {
        ...avg,
        advice: avg.lost !== null ? paceAdvice(avg.lost, state.pace) : null
      }
    }
  },

  actions: {
    load() {
      const pace = dbService.getConfig('nutri_pace')
      const dinner = dbService.getConfig('nutri_dinner')
      this.pace = pace === 'agr' ? 'agr' : 'mod'
      this.dinner = dinner === 'arepa' ? 'arepa' : 'clasica'
      this.gymDays = readGymDays()
      this.tick++
    },

    /** Se llama después de bajar datos del servidor. */
    reload() {
      this.load()
      useUserStore().loadStats()
    },

    /** Plan de cualquier día de la semana. Hoy cuenta como gym si ya entrenaste. */
    planFor(day: number): DayPlan {
      const gymDays = [...this.gymDays]
      if (day === this.todayIndex && this.trainedToday) gymDays[day] = true
      return buildDay(day, this.pace, this.dinner, gymDays)
    },

    setPace(p: Pace) {
      this.pace = p
      dbService.setConfig('nutri_pace', p)
      syncService.sync()
    },
    setDinner(d: DinnerKind) {
      this.dinner = d
      dbService.setConfig('nutri_dinner', d)
      syncService.sync()
    },
    toggleGymDay(i: number) {
      this.gymDays = this.gymDays.map((g, idx) => (idx === i ? !g : g))
      dbService.setConfig('nutri_gym_days', JSON.stringify(this.gymDays))
      syncService.sync()
    },

    checks(kind: CheckKind, period: string): string[] {
      this.tick
      return dbService.getNutritionChecks(kind, period)
    },
    toggleCheck(kind: CheckKind, period: string, item: string) {
      const on = dbService.getNutritionChecks(kind, period).includes(item)
      dbService.setNutritionCheck(kind, period, item, !on)
      this.tick++
      syncService.sync()
    },
    clearChecks(kind: CheckKind, period: string) {
      dbService.getNutritionChecks(kind, period).forEach(item => dbService.setNutritionCheck(kind, period, item, false))
      this.tick++
      syncService.sync()
    }
  }
})
