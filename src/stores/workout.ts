import { defineStore } from 'pinia'
import { dbService } from '../services/localDb'
import { DEFAULT_EXERCISES, DEFAULT_PROGRESSION } from './defaultData'
import { usePlansStore } from './plans'

export const useWorkoutStore = defineStore('workout', {
  state: () => ({
    currentWeek: 1,
    exercises: DEFAULT_EXERCISES, // Fallback if no active plan
    progression: DEFAULT_PROGRESSION,
    isLoaded: false,
    loggedThisSession: new Set<string>(),
    dbUpdateTrigger: 0
  }),

  actions: {
    async initialize() {
      await dbService.init();
      const plansStore = usePlansStore();
      plansStore.loadData();
      this.loadConfig();
      this.isLoaded = true;
    },

    loadConfig() {
      const w = dbService.getConfig('current_week');
      if (w) this.currentWeek = parseInt(w) || 1;

      const pg = dbService.getConfig('progression');
      if (pg) {
        try { this.progression = JSON.parse(pg); } catch(e) {}
      }
    },

    setWeek(w: number) {
      this.currentWeek = w;
      dbService.setConfig('current_week', w);
    },

    getWeekInfo(weekNum: number): Record<string, any> {
      const plansStore = usePlansStore();
      const activePlan = plansStore.activePlan;
      if (activePlan) {
        const progs = plansStore.progressionsForPlan(activePlan.id);
        const weekInfo = progs.find(p => p.week_number === weekNum);
        if (weekInfo) return weekInfo;
      }
      
      // Fallback
      const pd = this.progression.progression_data || [];
      return pd.find((x: any) => x.week_number === weekNum) || {};
    },

    getDays() {
      const plansStore = usePlansStore();
      const activeDays = plansStore.activePlanDays;
      if (activeDays.length > 0) {
        return activeDays.map(d => {
          return {
            id: d.id,
            day_number: d.day_number,
            session_name: d.session_name,
            exercises: plansStore.exercisesForDay(d.id)
          };
        });
      }
      // Fallback
      if (this.exercises.training_days) return this.exercises.training_days;
      return ((this.exercises as any).days || []).map((d: any, i: number) => {
        const dayKey = Object.keys(d).find(k => k.startsWith('day_'));
        return { day_number: i+1, session_name: dayKey ? d[dayKey] : 'Day '+(i+1), exercises: d.exercises || [] };
      });
    },

    calcTotalSets() {
      let t = 0;
      this.getDays().forEach((d: any) => {
        (d.exercises || []).forEach((ex: any) => {
          const etype = ex.exercise_type || (ex.duration_min||ex.duration_minutes ? 'cardio' : ex.duration_sec ? 'isometric' : 'strength');
          t += etype === 'cardio' ? 1 : (ex.sets || (ex.duration_sec ? 1 : 0));
        });
      });
      return t;
    },

    getLoggedSets(week: number) {
      this.dbUpdateTrigger; // trigger reactivity
      const r = dbService.q("SELECT COALESCE(SUM(sets),0) FROM workout_log WHERE week=?", [week]);
      return r.length && r[0].values.length ? (r[0].values[0][0] || 0) : 0;
    },

    isDayComplete(dayLabel: string) {
      this.dbUpdateTrigger; // trigger reactivity
      const r = dbService.q(
        "SELECT COUNT(*) FROM workout_log WHERE week=? AND day_label=? AND exercise='_day_complete'",
        [this.currentWeek, dayLabel]
      );
      return r.length && r[0].values.length ? (r[0].values[0][0] || 0) > 0 : false;
    },

    getCurrentDayIndex() {
      const days = this.getDays();
      for (let di = 0; di < days.length; di++) {
        const label = days[di].session_name || 'Día '+(di+1);
        if (!this.isDayComplete(label)) return di;
      }
      
      const totalWeeks = (this.progression.progression_data || []).length || 14;
      if (this.currentWeek < totalWeeks) {
        this.setWeek(this.currentWeek + 1);
      }
      return 0;
    },

    markDayComplete(dayLabel: string, di: number) {
      const syncId = crypto.randomUUID();
      dbService.run(
        `INSERT INTO workout_log (sync_id,week,day_label,exercise,sets,reps,weight_kg,rpe,notes,synced)
         VALUES (?,?,?,'_day_complete',1,0,0,0,'',0)`,
        [syncId, this.currentWeek, dayLabel]
      );
      this.loggedThisSession.add('_complete_'+di);
      this.dbUpdateTrigger++;
    },

    getSuggestedWeight(exName: string, weekInfo: any, exType: string, groupType: string) {
      this.dbUpdateTrigger; // trigger reactivity
      if (exType !== 'strength' || groupType === 'pyramid') return null;

      const r = dbService.q(
        `SELECT weight_kg, week FROM workout_log
         WHERE exercise=? AND week < ? AND weight_kg > 0
         ORDER BY week DESC, id DESC LIMIT 1`,
        [exName, this.currentWeek]
      );
      
      if (!r.length || !r[0].values.length) return null;
      const lastWeight = parseFloat(r[0].values[0][0]);
      const lastWeek = parseInt(r[0].values[0][1]);
      if (!lastWeight) return null;

      const pct = weekInfo.weight_change_pct || '0%';
      if (pct === 'maintain' || pct === '0%') return { kg: lastWeight, change: '=' };

      const match = pct.match(/([+-]?[\d.]+)%/);
      if (!match) return { kg: lastWeight, change: '=' };

      const delta = parseFloat(match[1]) / 100;
      const raw = lastWeight * (1 + delta);
      const rounded = Math.round(raw / 2.5) * 2.5;
      return { kg: rounded, change: pct, from: lastWeight, fromWeek: lastWeek };
    },

    getPrevLog(dayLabel: string, exName: string) {
      this.dbUpdateTrigger; // trigger reactivity
      const prevLog = dbService.q(
        `SELECT sets, reps, weight_kg, rpe, notes FROM workout_log
         WHERE week=? AND day_label=? AND exercise=? AND exercise != '_day_complete'
         ORDER BY id DESC LIMIT 1`,
        [this.currentWeek, dayLabel, exName]
      );
      return prevLog.length && prevLog[0].values.length ? prevLog[0].values[0] : null;
    }
  }
})
