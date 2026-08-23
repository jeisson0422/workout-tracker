import { dbService } from './localDb';

const BACKUP_TABLES = [
  'workout_log',
  'workout_log_sets',
  'plans',
  'training_days',
  'plan_exercises',
  'plan_progressions',
  'user_profile',
  'user_stats',
  'config'
];

function dumpTable(table: string): Record<string, any>[] {
  const res = dbService.q(`SELECT * FROM ${table}`);
  if (!res.length || !res[0].values) return [];
  const columns = res[0].columns;
  return res[0].values.map((row: any[]) => {
    const obj: Record<string, any> = {};
    columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
    return obj;
  });
}

export function exportBackup() {
  const tables: Record<string, any[]> = {};
  for (const t of BACKUP_TABLES) tables[t] = dumpTable(t);

  const backup = { version: 1, exported_at: new Date().toISOString(), tables };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workout-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importBackup(data: any) {
  if (!data || typeof data !== 'object' || typeof data.tables !== 'object') {
    throw new Error('El archivo no tiene el formato de respaldo esperado.');
  }

  for (const t of BACKUP_TABLES) {
    dbService.run(`DELETE FROM ${t}`);
  }

  for (const t of BACKUP_TABLES) {
    const rows = data.tables[t];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    for (const row of rows) {
      const cols = Object.keys(row);
      if (cols.length === 0) continue;
      const placeholders = cols.map(() => '?').join(',');
      dbService.run(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${placeholders})`, cols.map(c => row[c]));
    }
  }

  dbService.persistDB();
}
