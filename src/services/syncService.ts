import { supabase } from './supabase'
import { dbService } from './localDb'
import { useAuthStore } from '../stores/auth'
import { useWorkoutStore } from '../stores/workout'

import { usePlansStore } from '../stores/plans'
import { DEFAULT_EXERCISES, DEFAULT_PROGRESSION } from '../stores/defaultData'

class SyncService {
  private syncInterval: any = null;
  private isSyncing = false;

  startAutoSync() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    // Sincronizar cada 30 segundos si hay cambios
    this.syncInterval = setInterval(() => this.sync(), 30000);
    // Intentar sincronizar ahora mismo
    this.sync();
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async sync() {
    if (this.isSyncing) return;
    const authStore = useAuthStore();
    if (!authStore.user) return; // No hay sesión
    
    // Check if online
    if (!navigator.onLine) return;

    this.isSyncing = true;
    try {
      await this.pushPlans(authStore.user.id);
      await this.pushLogs(authStore.user.id);
      await this.pushConfig(authStore.user.id);
      
      await this.pullPlans(authStore.user.id);
      await this.pullLogs(authStore.user.id);
      await this.pullConfig(authStore.user.id);
    } catch (e) {
      console.error('Error durante la sincronización:', e);
    } finally {
      this.isSyncing = false;
    }
  }

  private async pushPlans(userId: string) {
    // 1. Push plans
    const unsyncedPlans = dbService.q("SELECT id, name, is_active, deleted, current_week FROM plans WHERE synced = 0");
    if (unsyncedPlans.length && unsyncedPlans[0].values.length) {
      for (const row of unsyncedPlans[0].values) {
        if (row[3] === 1) { // deleted
          await supabase.from('plans').delete().eq('id', row[0]);
        } else {
          await supabase.from('plans').upsert({ 
            id: row[0], user_id: userId, name: row[1], 
            is_active: row[2] === 1,
            current_week: row[4] || 1
          });
        }
        dbService.run("UPDATE plans SET synced = 1 WHERE id = ?", [row[0]]);
      }
    }

    // 2. Push training days
    const unsyncedDays = dbService.q("SELECT id, plan_id, day_number, session_name, deleted FROM training_days WHERE synced = 0");
    if (unsyncedDays.length && unsyncedDays[0].values.length) {
      for (const row of unsyncedDays[0].values) {
        if (row[4] === 1) { // deleted
          await supabase.from('training_days').delete().eq('id', row[0]);
        } else {
          await supabase.from('training_days').upsert({ id: row[0], plan_id: row[1], day_number: row[2], session_name: row[3] });
        }
        dbService.run("UPDATE training_days SET synced = 1 WHERE id = ?", [row[0]]);
      }
    }

    // 3. Push plan exercises
    const unsyncedEx = dbService.q("SELECT id, training_day_id, exercise_name, exercise_type, sets, reps, rest_seconds, order_index, special_notes, deleted, current_weight_kg, max_safety_limit_kg, tempo, group_id, group_type, duration_min, duration_sec, incline_pct, speed_kmh, target_heart_rate_bpm, intensity_mode, pyramid_reps, pyramid_weights_kg FROM plan_exercises WHERE synced = 0");
    if (unsyncedEx.length && unsyncedEx[0].values.length) {
      for (const row of unsyncedEx[0].values) {
        if (row[9] === 1) { // deleted
          await supabase.from('plan_exercises').delete().eq('id', row[0]);
        } else {
          await supabase.from('plan_exercises').upsert({ 
            id: row[0], training_day_id: row[1], exercise_name: row[2], exercise_type: row[3],
            sets: row[4], reps: row[5], rest_seconds: row[6], order_index: row[7], special_notes: row[8],
            current_weight_kg: row[10], max_safety_limit_kg: row[11], tempo: row[12], group_id: row[13], 
            group_type: row[14], duration_min: row[15], duration_sec: row[16], incline_pct: row[17], 
            speed_kmh: row[18], target_heart_rate_bpm: row[19], intensity_mode: row[20], 
            pyramid_reps: row[21] ? JSON.parse(row[21]) : null, 
            pyramid_weights_kg: row[22] ? JSON.parse(row[22]) : null
          });
        }
        dbService.run("UPDATE plan_exercises SET synced = 1 WHERE id = ?", [row[0]]);
      }
    }
    // 4. Push plan progressions
    const unsyncedProgs = dbService.q("SELECT id, plan_id, week_number, phase, weight_change_pct, reps_change, rpe_target, system_focus, deleted FROM plan_progressions WHERE synced = 0");
    if (unsyncedProgs.length && unsyncedProgs[0].values.length) {
      for (const row of unsyncedProgs[0].values) {
        if (row[8] === 1) { // deleted
          await supabase.from('plan_progressions').delete().eq('id', row[0]);
        } else {
          await supabase.from('plan_progressions').upsert({
            id: row[0], plan_id: row[1], week_number: row[2], phase: row[3],
            weight_change_pct: row[4], reps_change: row[5], rpe_target: row[6], system_focus: row[7]
          });
        }
        dbService.run("UPDATE plan_progressions SET synced = 1 WHERE id = ?", [row[0]]);
      }
    }
  }

  private async pullPlans(_userId: string) {
    const lastSyncDate = dbService.getConfig('last_plans_sync_date') || '2000-01-01T00:00:00.000Z';
    let latestUpdated = lastSyncDate;
    let didUpdate = false;

    const { data: plansData, error } = await supabase
      .from('plans')
      .select('*, training_days(*, plan_exercises(*)), plan_progressions(*)');

    if (error) {
      console.error('Error fetching plans:', error);
      return;
    }

    if (!plansData || plansData.length === 0) {
      // First time init: inject DEFAULT_EXERCISES
      const existing = dbService.q("SELECT COUNT(*) FROM plans");
      const hasLocal = existing.length && existing[0].values[0][0] > 0;
      
      if (!hasLocal) {
        const planId = crypto.randomUUID();
        dbService.run("INSERT INTO plans (id, name, is_active, synced, deleted) VALUES (?, ?, 1, 0, 0)", [planId, 'Plan Inicial']);
        
        const days = DEFAULT_EXERCISES.training_days || [];
        days.forEach((day: any, i: number) => {
          const dayId = crypto.randomUUID();
          dbService.run("INSERT INTO training_days (id, plan_id, day_number, session_name, synced, deleted) VALUES (?, ?, ?, ?, 0, 0)", 
            [dayId, planId, day.day_number || i+1, day.session_name || "Día " + (i+1)]);
          
          (day.exercises || []).forEach((ex: any, ei: number) => {
            const exId = crypto.randomUUID();
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
            );
          });
        });
        
        didUpdate = true;
        // The next push loop will upload these to Supabase
        
        // Inject DEFAULT_PROGRESSION
        const progs = DEFAULT_PROGRESSION.progression_data || [];
        progs.forEach((prog: any) => {
          const progId = crypto.randomUUID();
          dbService.run("INSERT INTO plan_progressions (id, plan_id, week_number, phase, weight_change_pct, reps_change, rpe_target, system_focus, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)",
            [progId, planId, prog.week_number, prog.phase, prog.weight_change_pct, prog.reps_change, prog.rpe_target, prog.system_focus]
          );
        });
      }
    } else {
      // We sync from server to local
      // To handle deletions that occurred on another device properly without soft deletes on the server, 
      // we'll truncate local (that are already synced) and re-insert, or do an upsert and delete orphans.
      // Upsert everything from server:
      
      const serverPlanIds = new Set();
      const serverDayIds = new Set();
      const serverExIds = new Set();
      const serverProgIds = new Set();

      for (const p of plansData) {
        serverPlanIds.add(p.id);
        
        // Evitar sobrescribir si hay cambios locales no subidos
        const local = dbService.q("SELECT synced FROM plans WHERE id=?", [p.id]);
        const isSynced = local.length && local[0].values.length ? local[0].values[0][0] === 1 : true;

        if (isSynced) {
          dbService.run("INSERT OR REPLACE INTO plans (id, name, is_active, synced, deleted, current_week) VALUES (?, ?, ?, 1, 0, ?)", 
            [p.id, p.name, p.is_active ? 1 : 0, p.current_week || 1]);
          if (p.updated_at > latestUpdated) latestUpdated = p.updated_at;
        }

        for (const d of p.training_days || []) {
          serverDayIds.add(d.id);
          dbService.run("INSERT OR REPLACE INTO training_days (id, plan_id, day_number, session_name, synced, deleted) VALUES (?, ?, ?, ?, 1, 0)",
            [d.id, p.id, d.day_number, d.session_name]);
          
          for (const e of d.plan_exercises || []) {
            serverExIds.add(e.id);
            dbService.run(`INSERT OR REPLACE INTO plan_exercises (
              id, training_day_id, exercise_name, exercise_type, sets, reps, rest_seconds, order_index, special_notes, 
              current_weight_kg, max_safety_limit_kg, tempo, group_id, group_type, duration_min, duration_sec, 
              incline_pct, speed_kmh, target_heart_rate_bpm, intensity_mode, pyramid_reps, pyramid_weights_kg,
              synced, deleted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
              [
                e.id, d.id, e.exercise_name, e.exercise_type, e.sets, e.reps, e.rest_seconds, e.order_index, e.special_notes,
                e.current_weight_kg, e.max_safety_limit_kg, e.tempo, e.group_id, e.group_type, e.duration_min, e.duration_sec,
                e.incline_pct, e.speed_kmh, e.target_heart_rate_bpm, e.intensity_mode, 
                e.pyramid_reps ? JSON.stringify(e.pyramid_reps) : null, 
                e.pyramid_weights_kg ? JSON.stringify(e.pyramid_weights_kg) : null
              ]
            );
          }
        }

        const progs = p.plan_progressions || [];
        if (progs.length === 0 && p.name === 'Plan Inicial') {
          // Autocorrección: Si viene de la nube sin progresiones (por la versión anterior), le inyectamos las del JSON
          const defaultProgs = DEFAULT_PROGRESSION.progression_data || [];
          defaultProgs.forEach((prog: any) => {
            const progId = crypto.randomUUID();
            dbService.run("INSERT INTO plan_progressions (id, plan_id, week_number, phase, weight_change_pct, reps_change, rpe_target, system_focus, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)",
              [progId, p.id, prog.week_number, prog.phase, prog.weight_change_pct, prog.reps_change, prog.rpe_target, prog.system_focus]
            );
          });
          didUpdate = true; // Forzará actualización y posterior push
        } else {
          for (const prog of progs) {
            serverProgIds.add(prog.id);
            dbService.run("INSERT OR REPLACE INTO plan_progressions (id, plan_id, week_number, phase, weight_change_pct, reps_change, rpe_target, system_focus, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0)",
              [prog.id, p.id, prog.week_number, prog.phase, prog.weight_change_pct, prog.reps_change, prog.rpe_target, prog.system_focus]);
          }
        }
      }
      
      didUpdate = true;
      dbService.setConfig('last_plans_sync_date', latestUpdated);
    }

    if (didUpdate) {
      const plansStore = usePlansStore();
      plansStore.loadData();
    }
  }

  private async pushLogs(userId: string) {
    // Buscar logs locales no sincronizados
    const unsyncedLogs = dbService.q("SELECT id, sync_id, week, day_label, exercise, sets, reps, weight_kg, rpe, notes, logged_at, plan_id FROM workout_log WHERE synced = 0");
    if (!unsyncedLogs.length || !unsyncedLogs[0].values.length) return;

    // Procesar en lotes pequeños por si hay muchos registros (ej. 100)
    const BATCH_SIZE = 100;
    const allRows = unsyncedLogs[0].values;
    
    for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
      const batch = allRows.slice(i, i + BATCH_SIZE);
      
      const rowsToPush = batch.map((row: any) => {
        // Asegurarse de que date sea un string válido para timestamp
        let validDate = row[10];
        if (!validDate || typeof validDate !== 'string') {
          validDate = new Date().toISOString();
        } else if (validDate.length === 16) { // Ej: '2023-10-25T10:30' (formato de strftime '%Y-%m-%dT%H:%M')
          validDate = validDate + ':00Z';
        } else if (!validDate.endsWith('Z')) {
          validDate = validDate + 'Z';
        }

        return {
          id: row[1], // sync_id
          user_id: userId,
          week: row[2],
          day_label: row[3] || 'Día ?',
          exercise: row[4] || 'Unknown',
          sets: Number(row[5]) || 0,
          reps: Number(row[6]) || 0,
          weight_kg: Number(row[7]) || 0,
          rpe: Number(row[8]) || 0,
          notes: row[9] || '',
          logged_at: validDate,
          plan_id: row[11] || null
        };
      });

      const { error } = await supabase.from('workout_logs').upsert(rowsToPush, { onConflict: 'id' });
      
      if (!error) {
        // Marcar solo los de este lote como sincronizados en SQLite
        const ids = batch.map((row: any) => row[0]); // ids locales
        const placeholders = ids.map(() => '?').join(',');
        dbService.run(`UPDATE workout_log SET synced = 1 WHERE id IN (${placeholders})`, ids);
      } else {
        console.error('Error pushing logs batch:', error);
      }
    }
  }

  private async pullLogs(_userId: string) {
    // Obtener la fecha de la última sincronización
    const lastSyncDate = dbService.getConfig('last_sync_date') || '2000-01-01T00:00:00.000Z';

    const { data: remoteLogs, error } = await supabase
      .from('workout_logs')
      .select('*')
      .gt('updated_at', lastSyncDate)
      .order('updated_at', { ascending: true });

    if (error || !remoteLogs || remoteLogs.length === 0) return;

    let latestUpdated = lastSyncDate;
    let didUpdate = false;

    // Guardar los logs remotos en SQLite
    remoteLogs.forEach((log) => {
      // Intentar actualizar si el sync_id ya existe
      const existing = dbService.q("SELECT id, synced FROM workout_log WHERE sync_id=?", [log.id]);
      const isSynced = existing.length && existing[0].values.length ? existing[0].values[0][1] === 1 : true;
      
      if (!isSynced) return; // No sobrescribir cambios locales

      // Limpiar Z para guardar local como string
      const localDate = log.logged_at.replace('Z', '');

      if (existing.length && existing[0].values.length) {
        dbService.run(
          `UPDATE workout_log SET week=?, day_label=?, exercise=?, sets=?, reps=?, weight_kg=?, rpe=?, notes=?, logged_at=?, synced=1, plan_id=? WHERE sync_id=?`,
          [log.week, log.day_label, log.exercise, log.sets, log.reps, log.weight_kg, log.rpe, log.notes, localDate, log.plan_id, log.id]
        );
      } else {
        dbService.run(
          `INSERT INTO workout_log (sync_id, week, day_label, exercise, sets, reps, weight_kg, rpe, notes, logged_at, synced, plan_id) VALUES (?,?,?,?,?,?,?,?,?,?,1,?)`,
          [log.id, log.week, log.day_label, log.exercise, log.sets, log.reps, log.weight_kg, log.rpe, log.notes, localDate, log.plan_id]
        );
      }
      didUpdate = true;
      
      if (log.updated_at > latestUpdated) {
        latestUpdated = log.updated_at;
      }
    });

    dbService.setConfig('last_sync_date', latestUpdated);
    if (didUpdate) {
      const workoutStore = useWorkoutStore();
      workoutStore.dbUpdateTrigger++;
    }
  }

  private async pushConfig(userId: string) {
    // Los config cambiados localmente se envían a la nube (solo enviaremos si sabemos que hubo cambios, pero por ahora enviaremos todo o lo más importante si marcamos una bandera de dirty)
    // Para simplificar, pushearemos el config local que tenga un valor "synced = 0" 
    const unsyncedConfigs = dbService.q("SELECT key, value FROM config WHERE synced = 0");
    if (!unsyncedConfigs.length || !unsyncedConfigs[0].values.length) return;

    const rowsToPush = unsyncedConfigs[0].values.map((row: any) => ({
      user_id: userId,
      key: row[0],
      value: row[1]
    }));

    const { error } = await supabase.from('user_configs').upsert(rowsToPush, { onConflict: 'user_id,key' });

    if (!error) {
      const keys = unsyncedConfigs[0].values.map((row: any) => row[0]);
      const placeholders = keys.map(() => '?').join(',');
      dbService.run(`UPDATE config SET synced = 1 WHERE key IN (${placeholders})`, keys);
    }
  }

  private async pullConfig(_userId: string) {
    const lastSyncDate = dbService.getConfig('last_config_sync_date') || '2000-01-01T00:00:00.000Z';

    const { data: remoteConfigs, error } = await supabase
      .from('user_configs')
      .select('*')
      .gt('updated_at', lastSyncDate)
      .order('updated_at', { ascending: true });

    if (error || !remoteConfigs || remoteConfigs.length === 0) return;

    let latestUpdated = lastSyncDate;
    let didUpdate = false;

    remoteConfigs.forEach((conf) => {
      // Guardar local pero marcarlo como sincronizado
      dbService.run("INSERT OR REPLACE INTO config (key, value, synced) VALUES (?, ?, 1)", [conf.key, conf.value]);
      didUpdate = true;
      if (conf.updated_at > latestUpdated) {
        latestUpdated = conf.updated_at;
      }
    });

    dbService.setConfig('last_config_sync_date', latestUpdated);
    if (didUpdate) {
      const workoutStore = useWorkoutStore();
      workoutStore.loadConfig();
      workoutStore.dbUpdateTrigger++;
    }
  }
}

export const syncService = new SyncService();
