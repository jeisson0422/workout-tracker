declare const initSqlJs: any;

class LocalDbService {
  db: any = null;
  SQL: any = null;
  initialized = false;

  async init() {
    if (this.initialized) return;
    try {
      this.SQL = await initSqlJs({
        locateFile: () => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.wasm'
      });
      this.restoreDB();
      this.createSchema();
      this.initialized = true;
    } catch (e) {
      console.error('Error cargando SQLite', e);
    }
  }

  restoreDB() {
    try {
      const saved = localStorage.getItem('wt_db_v2');
      if (saved) {
        const buf = Uint8Array.from(atob(saved), c => c.charCodeAt(0));
        this.db = new this.SQL.Database(buf);
        return;
      }
    } catch(e) {}
    this.db = new this.SQL.Database();
  }

  persistDB() {
    try {
      const buf = this.db.export();
      localStorage.setItem('wt_db_v2', btoa(String.fromCharCode(...buf)));
    } catch(e) {
      console.error('Error guardando datos', e);
    }
  }

  createSchema() {
    this.run(`CREATE TABLE IF NOT EXISTS workout_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_id TEXT UNIQUE,
      week INTEGER NOT NULL,
      day_label TEXT NOT NULL,
      exercise TEXT NOT NULL,
      sets INTEGER DEFAULT 0,
      reps INTEGER DEFAULT 0,
      weight_kg REAL DEFAULT 0,
      rpe REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      logged_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M','now','localtime')),
      synced INTEGER DEFAULT 0
    )`);
    this.run(`CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    )`);
    this.run(`CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0
    )`);
    this.run(`CREATE TABLE IF NOT EXISTS training_days (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      day_number INTEGER NOT NULL,
      session_name TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0
    )`);
    this.run(`CREATE TABLE IF NOT EXISTS plan_exercises (
      id TEXT PRIMARY KEY,
      training_day_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      exercise_type TEXT DEFAULT 'strength',
      sets INTEGER DEFAULT 0,
      reps INTEGER DEFAULT 0,
      rest_seconds INTEGER DEFAULT 60,
      order_index INTEGER DEFAULT 0,
      special_notes TEXT,
      synced INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0
    )`);
    this.run(`CREATE TABLE IF NOT EXISTS plan_progressions (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      phase TEXT,
      weight_change_pct TEXT,
      reps_change TEXT,
      rpe_target REAL,
      system_focus TEXT,
      synced INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0
    )`);
    
    this.runMigrations();
    this.persistDB();
  }

  runMigrations() {
    // Migrar workout_log
    const colsLog = this.q("PRAGMA table_info(workout_log)");
    if (colsLog.length && colsLog[0].values) {
      const hasSyncId = colsLog[0].values.some((col: any) => col[1] === 'sync_id');
      const hasSynced = colsLog[0].values.some((col: any) => col[1] === 'synced');
      
      if (!hasSyncId) {
        this.run("ALTER TABLE workout_log ADD COLUMN sync_id TEXT");
        
        // Popular UUIDs
        const rows = this.q("SELECT id FROM workout_log WHERE sync_id IS NULL");
        if (rows.length && rows[0].values) {
          rows[0].values.forEach((row: any) => {
            const uuid = crypto.randomUUID();
            this.run("UPDATE workout_log SET sync_id = ? WHERE id = ?", [uuid, row[0]]);
          });
        }
      }
      
      this.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_log_sync_id ON workout_log(sync_id)");
      
      if (!hasSynced) {
        this.run("ALTER TABLE workout_log ADD COLUMN synced INTEGER DEFAULT 0");
      }
    }

    // Migrar config
    const colsConfig = this.q("PRAGMA table_info(config)");
    if (colsConfig.length && colsConfig[0].values) {
      const hasSyncedConfig = colsConfig[0].values.some((col: any) => col[1] === 'synced');
      if (!hasSyncedConfig) {
        this.run("ALTER TABLE config ADD COLUMN synced INTEGER DEFAULT 0");
      }
    }
  }

  q(sql: string, params: any[] = []) {
    if (!this.db) return [];
    try { return this.db.exec(sql, params); } catch(e) { return []; }
  }

  run(sql: string, params: any[] = []) {
    if (!this.db) return;
    try { 
      this.db.run(sql, params); 
      this.persistDB(); 
    } catch(e) { 
      console.error(e); 
    }
  }

  setConfig(key: string, value: any) {
    const v = typeof value === 'string' ? value : JSON.stringify(value);
    this.run("INSERT OR REPLACE INTO config (key,value,synced) VALUES (?,?,0)", [key, v]);
  }

  getConfig(key: string): any {
    const row = this.q("SELECT value FROM config WHERE key=?", [key]);
    if (row.length && row[0].values.length) {
      return row[0].values[0][0];
    }
    return null;
  }
}

export const dbService = new LocalDbService();
