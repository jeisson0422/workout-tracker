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
      current_weight_kg REAL,
      max_safety_limit_kg REAL,
      tempo TEXT,
      group_id TEXT,
      group_type TEXT,
      duration_min INTEGER,
      duration_sec INTEGER,
      incline_pct INTEGER,
      speed_kmh REAL,
      target_heart_rate_bpm INTEGER,
      intensity_mode TEXT,
      pyramid_reps TEXT,
      pyramid_weights_kg TEXT,
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
    this.run(`CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY,
      weight_kg REAL,
      height_cm REAL,
      age INTEGER,
      gender TEXT,
      goal TEXT,
      equipment_available TEXT,
      injuries TEXT,
      days_per_week INTEGER DEFAULT 4,
      training_level TEXT DEFAULT 'intermediate',
      plan_duration_weeks INTEGER DEFAULT 4,
      synced INTEGER DEFAULT 0
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

    // Migrar plan_exercises para soportar los nuevos campos del README legacy
    const colsPlanExercises = this.q("PRAGMA table_info(plan_exercises)");
    if (colsPlanExercises.length && colsPlanExercises[0].values) {
      const existingCols = colsPlanExercises[0].values.map((col: any) => col[1]);
      const missingCols = [
        { name: 'current_weight_kg', type: 'REAL' },
        { name: 'max_safety_limit_kg', type: 'REAL' },
        { name: 'tempo', type: 'TEXT' },
        { name: 'group_id', type: 'TEXT' },
        { name: 'group_type', type: 'TEXT' },
        { name: 'duration_min', type: 'INTEGER' },
        { name: 'duration_sec', type: 'INTEGER' },
        { name: 'incline_pct', type: 'INTEGER' },
        { name: 'speed_kmh', type: 'REAL' },
        { name: 'target_heart_rate_bpm', type: 'INTEGER' },
        { name: 'intensity_mode', type: 'TEXT' },
        { name: 'pyramid_reps', type: 'TEXT' },
        { name: 'pyramid_weights_kg', type: 'TEXT' }
      ];

      missingCols.forEach(col => {
        if (!existingCols.includes(col.name)) {
          this.run(`ALTER TABLE plan_exercises ADD COLUMN ${col.name} ${col.type}`);
        }
      });
    }
    // Migrar config
    const colsConfig = this.q("PRAGMA table_info(config)");
    if (colsConfig.length && colsConfig[0].values) {
      const hasSyncedConfig = colsConfig[0].values.some((col: any) => col[1] === 'synced');
      if (!hasSyncedConfig) {
        this.run("ALTER TABLE config ADD COLUMN synced INTEGER DEFAULT 0");
      }
    }

    // Migrar user_profile para soportar todos los campos (biométricos, frecuencia, nivel)
    const colsProfile = this.q("PRAGMA table_info(user_profile)");
    if (colsProfile.length && colsProfile[0].values) {
      const existingCols = colsProfile[0].values.map((col: any) => col[1]);
      const profileCols = [
        { name: 'weight_kg', type: 'REAL' },
        { name: 'height_cm', type: 'REAL' },
        { name: 'age', type: 'INTEGER' },
        { name: 'gender', type: 'TEXT' },
        { name: 'goal', type: 'TEXT' },
        { name: 'modalities', type: 'TEXT' },
        { name: 'injuries', type: 'TEXT' },
        { name: 'days_per_week', type: 'INTEGER DEFAULT 4' },
        { name: 'training_level', type: 'TEXT DEFAULT "intermediate"' },
        { name: 'plan_duration_weeks', type: 'INTEGER DEFAULT 4' },
        { name: 'synced', type: 'INTEGER DEFAULT 0' }
      ];

      profileCols.forEach(col => {
        if (!existingCols.includes(col.name)) {
          this.run(`ALTER TABLE user_profile ADD COLUMN ${col.name} ${col.type}`);
        }
      });
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

  getProfile(id: string = 'default'): any {
    const res = this.q("SELECT * FROM user_profile WHERE id=?", [id]);
    if (res.length && res[0].values.length) {
      const r = res[0].values[0];
      const cols = res[0].columns;
      const profile: Record<string, any> = {};
      cols.forEach((col: string, i: number) => {
        profile[col] = r[i];
      });
      return profile;
    }
    return null;
  }

  saveProfile(p: any) {
    const id = p.id || 'default';
    this.run(
      `INSERT OR REPLACE INTO user_profile (
        id, weight_kg, height_cm, age, gender, goal, modalities, injuries, 
        days_per_week, training_level, plan_duration_weeks, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        id, p.weight_kg, p.height_cm, p.age, p.gender, p.goal, p.modalities, p.injuries, 
        p.days_per_week, p.training_level, p.plan_duration_weeks
      ]
    );
  }

  addStats(stats: any) {
    this.run(
      "INSERT INTO user_stats (weight_kg, body_fat_pct, notes, recorded_at, synced) VALUES (?, ?, ?, ?, 0)",
      [stats.weight_kg, stats.body_fat_pct, stats.notes, stats.recorded_at || new Date().toISOString()]
    );
  }

  getStatsHistory(limit: number = 20): any[] {
    const res = this.q("SELECT weight_kg, body_fat_pct, notes, recorded_at FROM user_stats ORDER BY recorded_at DESC LIMIT ?", [limit]);
    if (res.length && res[0].values) {
      return res[0].values.map((r: any) => ({
        weight_kg: r[0],
        body_fat_pct: r[1],
        notes: r[2],
        recorded_at: r[3]
      }));
    }
    return [];
  }

  getRecentLogs(limit: number = 20): any[] {
    const res = this.q(
      `SELECT exercise, sets, reps, weight_kg, rpe, logged_at 
       FROM workout_log 
       WHERE exercise != '_day_complete' 
       ORDER BY logged_at DESC LIMIT ?`, 
      [limit]
    );
    if (res.length && res[0].values) {
      return res[0].values.map((r: any) => ({
        exercise: r[0],
        sets: r[1],
        reps: r[2],
        weight_kg: r[3],
        rpe: r[4],
        logged_at: r[5]
      }));
    }
    return [];
  }
}

export const dbService = new LocalDbService();
