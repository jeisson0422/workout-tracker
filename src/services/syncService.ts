import { supabase } from './supabase'
import { dbService } from './localDb'
import { useAuthStore } from '../stores/auth'
import { useWorkoutStore } from '../stores/workout'

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
      await this.pushLogs(authStore.user.id);
      await this.pushConfig(authStore.user.id);
      await this.pullLogs(authStore.user.id);
      await this.pullConfig(authStore.user.id);
    } catch (e) {
      console.error('Error durante la sincronización:', e);
    } finally {
      this.isSyncing = false;
    }
  }

  private async pushLogs(userId: string) {
    // Buscar logs locales no sincronizados
    const unsyncedLogs = dbService.q("SELECT id, sync_id, week, day_label, exercise, sets, reps, weight_kg, rpe, notes, logged_at FROM workout_log WHERE synced = 0");
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
      const existing = dbService.q("SELECT id FROM workout_log WHERE sync_id=?", [log.id]);
      
      // Limpiar Z para guardar local como string
      const localDate = log.logged_at.replace('Z', '');

      if (existing.length && existing[0].values.length) {
        dbService.run(
          `UPDATE workout_log SET week=?, day_label=?, exercise=?, sets=?, reps=?, weight_kg=?, rpe=?, notes=?, logged_at=?, synced=1 WHERE sync_id=?`,
          [log.week, log.day_label, log.exercise, log.sets, log.reps, log.weight_kg, log.rpe, log.notes, localDate, log.id]
        );
      } else {
        dbService.run(
          `INSERT INTO workout_log (sync_id, week, day_label, exercise, sets, reps, weight_kg, rpe, notes, logged_at, synced) VALUES (?,?,?,?,?,?,?,?,?,?,1)`,
          [log.id, log.week, log.day_label, log.exercise, log.sets, log.reps, log.weight_kg, log.rpe, log.notes, localDate]
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
