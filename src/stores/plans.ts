import { defineStore } from 'pinia'
import { dbService } from '../services/localDb'

export interface Plan {
  id: string
  name: string
  is_active: boolean
  synced: boolean
  deleted: boolean
}

export interface TrainingDay {
  id: string
  plan_id: string
  day_number: number
  session_name: string
  synced: boolean
  deleted: boolean
}

export interface PlanExercise {
  id: string
  training_day_id: string
  exercise_name: string
  exercise_type: string
  sets: number
  reps: number
  rest_seconds: number
  order_index: number
  special_notes: string
  synced: boolean
  deleted: boolean
}

export interface PlanProgression {
  id: string
  plan_id: string
  week_number: number
  phase: string
  weight_change_pct: string
  reps_change: string
  rpe_target: number
  system_focus: string
  synced: boolean
  deleted: boolean
}

export const usePlansStore = defineStore('plans', {
  state: () => ({
    plans: [] as Plan[],
    trainingDays: [] as TrainingDay[],
    planExercises: [] as PlanExercise[],
    planProgressions: [] as PlanProgression[],
    dbUpdateTrigger: 0
  }),
  getters: {
    activePlan: (state) => state.plans.find(p => p.is_active && !p.deleted),
    activePlanDays: (state) => {
      const plan = state.plans.find(p => p.is_active && !p.deleted);
      if (!plan) return [];
      return state.trainingDays
        .filter(d => d.plan_id === plan.id && !d.deleted)
        .sort((a, b) => a.day_number - b.day_number);
    },
    exercisesForDay: (state) => (dayId: string) => {
      return state.planExercises
        .filter(e => e.training_day_id === dayId && !e.deleted)
        .sort((a, b) => a.order_index - b.order_index);
    },
    progressionsForPlan: (state) => (planId: string) => {
      return state.planProgressions
        .filter(p => p.plan_id === planId && !p.deleted)
        .sort((a, b) => a.week_number - b.week_number);
    }
  },
  actions: {
    loadData() {
      this.dbUpdateTrigger; // trigger reactivity
      
      const plansRes = dbService.q("SELECT id, name, is_active, synced, deleted FROM plans WHERE deleted = 0");
      this.plans = plansRes.length && plansRes[0].values ? plansRes[0].values.map((r: any) => ({
        id: r[0], name: r[1], is_active: r[2] === 1, synced: r[3] === 1, deleted: r[4] === 1
      })) : [];

      const daysRes = dbService.q("SELECT id, plan_id, day_number, session_name, synced, deleted FROM training_days WHERE deleted = 0");
      this.trainingDays = daysRes.length && daysRes[0].values ? daysRes[0].values.map((r: any) => ({
        id: r[0], plan_id: r[1], day_number: r[2], session_name: r[3], synced: r[4] === 1, deleted: r[5] === 1
      })) : [];

      const exRes = dbService.q("SELECT id, training_day_id, exercise_name, exercise_type, sets, reps, rest_seconds, order_index, special_notes, synced, deleted FROM plan_exercises WHERE deleted = 0");
      this.planExercises = exRes.length && exRes[0].values ? exRes[0].values.map((r: any) => ({
        id: r[0], training_day_id: r[1], exercise_name: r[2], exercise_type: r[3], sets: r[4], reps: r[5], rest_seconds: r[6], order_index: r[7], special_notes: r[8], synced: r[9] === 1, deleted: r[10] === 1
      })) : [];

      const progRes = dbService.q("SELECT id, plan_id, week_number, phase, weight_change_pct, reps_change, rpe_target, system_focus, synced, deleted FROM plan_progressions WHERE deleted = 0");
      this.planProgressions = progRes.length && progRes[0].values ? progRes[0].values.map((r: any) => ({
        id: r[0], plan_id: r[1], week_number: r[2], phase: r[3], weight_change_pct: r[4], reps_change: r[5], rpe_target: r[6], system_focus: r[7], synced: r[8] === 1, deleted: r[9] === 1
      })) : [];
    },

    createPlan(name: string) {
      const id = crypto.randomUUID();
      const isActive = this.plans.length === 0 ? 1 : 0;
      dbService.run("INSERT INTO plans (id, name, is_active, synced, deleted) VALUES (?, ?, ?, 0, 0)", [id, name, isActive]);
      this.dbUpdateTrigger++;
      this.loadData();
      return id;
    },

    updatePlan(id: string, name: string) {
      dbService.run("UPDATE plans SET name = ?, synced = 0 WHERE id = ?", [name, id]);
      this.dbUpdateTrigger++;
      this.loadData();
    },

    setActivePlan(id: string) {
      dbService.run("UPDATE plans SET is_active = 0, synced = 0");
      dbService.run("UPDATE plans SET is_active = 1, synced = 0 WHERE id = ?", [id]);
      this.dbUpdateTrigger++;
      this.loadData();
    },

    deletePlan(id: string) {
      dbService.run("UPDATE plans SET deleted = 1, synced = 0 WHERE id = ?", [id]);
      this.dbUpdateTrigger++;
      this.loadData();
    },

    addDay(planId: string, sessionName: string) {
      const id = crypto.randomUUID();
      const planDays = this.trainingDays.filter(d => d.plan_id === planId && !d.deleted);
      const nextDayNumber = planDays.length > 0 ? Math.max(...planDays.map(d => d.day_number)) + 1 : 1;
      
      dbService.run("INSERT INTO training_days (id, plan_id, day_number, session_name, synced, deleted) VALUES (?, ?, ?, ?, 0, 0)", 
        [id, planId, nextDayNumber, sessionName]);
      this.dbUpdateTrigger++;
      this.loadData();
      return id;
    },

    updateDay(id: string, sessionName: string) {
      dbService.run("UPDATE training_days SET session_name = ?, synced = 0 WHERE id = ?", [sessionName, id]);
      this.dbUpdateTrigger++;
      this.loadData();
    },

    deleteDay(id: string) {
      dbService.run("UPDATE training_days SET deleted = 1, synced = 0 WHERE id = ?", [id]);
      this.dbUpdateTrigger++;
      this.loadData();
    },

    addExercise(dayId: string, ex: Partial<PlanExercise>) {
      const id = crypto.randomUUID();
      const dayExercises = this.planExercises.filter(e => e.training_day_id === dayId && !e.deleted);
      const nextOrder = dayExercises.length > 0 ? Math.max(...dayExercises.map(e => e.order_index)) + 1 : 1;
      
      dbService.run(
        `INSERT INTO plan_exercises (id, training_day_id, exercise_name, exercise_type, sets, reps, rest_seconds, order_index, special_notes, synced, deleted) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
        [id, dayId, ex.exercise_name || 'Nuevo Ejercicio', ex.exercise_type || 'strength', ex.sets || 0, ex.reps || 0, ex.rest_seconds || 60, nextOrder, ex.special_notes || '']
      );
      this.dbUpdateTrigger++;
      this.loadData();
      return id;
    },

    updateExercise(id: string, ex: Partial<PlanExercise>) {
      // Fetch current
      const current = dbService.q("SELECT exercise_name, exercise_type, sets, reps, rest_seconds, special_notes FROM plan_exercises WHERE id = ?", [id]);
      if (!current.length || !current[0].values) return;
      const c = current[0].values[0];
      
      const name = ex.exercise_name !== undefined ? ex.exercise_name : c[0];
      const type = ex.exercise_type !== undefined ? ex.exercise_type : c[1];
      const sets = ex.sets !== undefined ? ex.sets : c[2];
      const reps = ex.reps !== undefined ? ex.reps : c[3];
      const rest = ex.rest_seconds !== undefined ? ex.rest_seconds : c[4];
      const notes = ex.special_notes !== undefined ? ex.special_notes : c[5];

      dbService.run(
        `UPDATE plan_exercises 
         SET exercise_name = ?, exercise_type = ?, sets = ?, reps = ?, rest_seconds = ?, special_notes = ?, synced = 0 
         WHERE id = ?`,
        [name, type, sets, reps, rest, notes, id]
      );
      this.dbUpdateTrigger++;
      this.loadData();
    },

    deleteExercise(id: string) {
      dbService.run("UPDATE plan_exercises SET deleted = 1, synced = 0 WHERE id = ?", [id]);
      this.dbUpdateTrigger++;
      this.loadData();
    },

    addProgression(planId: string, prog: Partial<PlanProgression>) {
      const id = crypto.randomUUID();
      const planProgs = this.planProgressions.filter(p => p.plan_id === planId && !p.deleted);
      const nextWeek = planProgs.length > 0 ? Math.max(...planProgs.map(p => p.week_number)) + 1 : 1;

      dbService.run(
        `INSERT INTO plan_progressions (id, plan_id, week_number, phase, weight_change_pct, reps_change, rpe_target, system_focus, synced, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
        [id, planId, prog.week_number || nextWeek, prog.phase || 'adaptation', prog.weight_change_pct || '0%', prog.reps_change || 'maintain', prog.rpe_target || 7, prog.system_focus || '']
      );
      this.dbUpdateTrigger++;
      this.loadData();
      return id;
    },

    updateProgression(id: string, prog: Partial<PlanProgression>) {
      const current = dbService.q("SELECT phase, weight_change_pct, reps_change, rpe_target, system_focus FROM plan_progressions WHERE id = ?", [id]);
      if (!current.length || !current[0].values) return;
      const c = current[0].values[0];

      const phase = prog.phase !== undefined ? prog.phase : c[0];
      const weight = prog.weight_change_pct !== undefined ? prog.weight_change_pct : c[1];
      const reps = prog.reps_change !== undefined ? prog.reps_change : c[2];
      const rpe = prog.rpe_target !== undefined ? prog.rpe_target : c[3];
      const focus = prog.system_focus !== undefined ? prog.system_focus : c[4];

      dbService.run(
        `UPDATE plan_progressions 
         SET phase = ?, weight_change_pct = ?, reps_change = ?, rpe_target = ?, system_focus = ?, synced = 0 
         WHERE id = ?`,
        [phase, weight, reps, rpe, focus, id]
      );
      this.dbUpdateTrigger++;
      this.loadData();
    },

    deleteProgression(id: string) {
      dbService.run("UPDATE plan_progressions SET deleted = 1, synced = 0 WHERE id = ?", [id]);
      this.dbUpdateTrigger++;
      this.loadData();
    }
  }
})
