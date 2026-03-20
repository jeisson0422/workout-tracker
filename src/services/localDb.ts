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
      week INTEGER NOT NULL,
      day_label TEXT NOT NULL,
      exercise TEXT NOT NULL,
      sets INTEGER DEFAULT 0,
      reps INTEGER DEFAULT 0,
      weight_kg REAL DEFAULT 0,
      rpe REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      logged_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M','now','localtime'))
    )`);
    this.run(`CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`);
    this.persistDB();
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
    this.run("INSERT OR REPLACE INTO config (key,value) VALUES (?,?)", [key, v]);
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
