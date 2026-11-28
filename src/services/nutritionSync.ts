// Sincronización de peso y nutrición con Supabase (tablas body_stats y nutrition_checks, ambas con RLS).
// Mismo patrón que syncService: filas locales con synced = 0 suben; lo nuevo del servidor baja
// sin pisar cambios locales pendientes.

import { supabase } from './supabase'
import { dbService } from './localDb'
import { useNutritionStore } from '../stores/nutrition'

const CURSOR_STATS = 'last_body_stats_sync_date'
const CURSOR_CHECKS = 'last_nutrition_checks_sync_date'
const CURSOR_EXTRAS = 'last_nutrition_extras_sync_date'
const EPOCH ='2000-01-01T00:00:00.000Z'

// Los cursores no se suben a user_configs: se guardan ya marcados como sincronizados.
function getCursor(key: string): string {
  return dbService.getConfig(key) || EPOCH
}
function setCursor(key: string, value: string) {
  dbService.run('INSERT OR REPLACE INTO config (key, value, synced) VALUES (?, ?, 1)', [key, value])
}

const rowsOf = (res: any[]): any[][] => (res.length && res[0].values ? res[0].values : [])

async function pushBodyStats(userId: string) {
  const rows = rowsOf(dbService.q('SELECT sync_id, weight_kg, body_fat_pct, notes, recorded_at, deleted FROM user_stats WHERE synced = 0 AND sync_id IS NOT NULL'))
  for (const r of rows) {
    if (r[5] === 1) {
      const { error } = await supabase.from('body_stats').delete().eq('id', r[0])
      if (!error) dbService.run('DELETE FROM user_stats WHERE sync_id = ?', [r[0]])
      continue
    }
    const { error } = await supabase.from('body_stats').upsert({
      id: r[0], user_id: userId, weight_kg: r[1], body_fat_pct: r[2], notes: r[3] || '',
      recorded_at: new Date(r[4]).toISOString()
    })
    if (!error) dbService.run('UPDATE user_stats SET synced = 1 WHERE sync_id = ?', [r[0]])
  }
}

async function pullBodyStats() {
  const cursor = getCursor(CURSOR_STATS)
  const { data, error } = await supabase.from('body_stats').select('*').gt('updated_at', cursor).order('updated_at', { ascending: true })
  if (error || !data?.length) return false

  let latest = cursor
  for (const s of data) {
    dbService.run(
      `INSERT INTO user_stats (sync_id, weight_kg, body_fat_pct, notes, recorded_at, synced)
       VALUES (?, ?, ?, ?, ?, 1)
       ON CONFLICT(sync_id) DO UPDATE SET weight_kg = excluded.weight_kg, body_fat_pct = excluded.body_fat_pct,
         notes = excluded.notes, recorded_at = excluded.recorded_at, synced = 1
       WHERE user_stats.synced = 1`,
      [s.id, s.weight_kg, s.body_fat_pct, s.notes || '', s.recorded_at]
    )
    if (s.updated_at > latest) latest = s.updated_at
  }
  setCursor(CURSOR_STATS, latest)
  return true
}

async function pushChecks(userId: string) {
  const rows = rowsOf(dbService.q('SELECT kind, period, item, checked FROM nutrition_checks WHERE synced = 0'))
  if (!rows.length) return
  const payload = rows.map(r => ({ user_id: userId, kind: r[0], period: r[1], item: r[2], checked: r[3] === 1 }))
  const { error } = await supabase.from('nutrition_checks').upsert(payload, { onConflict: 'user_id,kind,period,item' })
  if (error) return
  for (const r of rows) {
    dbService.run('UPDATE nutrition_checks SET synced = 1 WHERE kind = ? AND period = ? AND item = ?', [r[0], r[1], r[2]])
  }
}

async function pullChecks() {
  const cursor = getCursor(CURSOR_CHECKS)
  const { data, error } = await supabase.from('nutrition_checks').select('*').gt('updated_at', cursor).order('updated_at', { ascending: true })
  if (error || !data?.length) return false

  let latest = cursor
  for (const c of data) {
    dbService.run(
      `INSERT INTO nutrition_checks (kind, period, item, checked, synced) VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(kind, period, item) DO UPDATE SET checked = excluded.checked, synced = 1
       WHERE nutrition_checks.synced = 1`,
      [c.kind, c.period, c.item, c.checked ? 1 : 0]
    )
    if (c.updated_at > latest) latest = c.updated_at
  }
  setCursor(CURSOR_CHECKS, latest)
  return true
}

async function pushExtras(userId: string) {
  const rows = rowsOf(dbService.q('SELECT id, period, name, kcal, protein_g, deleted FROM nutrition_extras WHERE synced = 0'))
  if (!rows.length) return
  const payload = rows.map(r => ({ id: r[0], user_id: userId, period: r[1], name: r[2], kcal: r[3], protein_g: r[4], deleted: r[5] === 1 }))
  const { error } = await supabase.from('nutrition_extras').upsert(payload)
  if (error) return
  for (const r of rows) dbService.run('UPDATE nutrition_extras SET synced = 1 WHERE id = ?', [r[0]])
}

async function pullExtras() {
  const cursor = getCursor(CURSOR_EXTRAS)
  const { data, error } = await supabase.from('nutrition_extras').select('*').gt('updated_at', cursor).order('updated_at', { ascending: true })
  if (error || !data?.length) return false

  let latest = cursor
  for (const e of data) {
    dbService.run(
      `INSERT INTO nutrition_extras (id, period, name, kcal, protein_g, deleted, synced) VALUES (?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(id) DO UPDATE SET period = excluded.period, name = excluded.name, kcal = excluded.kcal,
         protein_g = excluded.protein_g, deleted = excluded.deleted, synced = 1
       WHERE nutrition_extras.synced = 1`,
      [e.id, e.period, e.name, e.kcal, e.protein_g, e.deleted ? 1 : 0]
    )
    if (e.updated_at > latest) latest = e.updated_at
  }
  setCursor(CURSOR_EXTRAS, latest)
  return true
}

/** Sube lo pendiente y baja lo nuevo. Recarga la tienda si llegó algo del servidor. */
export async function syncNutrition(userId: string): Promise<void> {
  await pushBodyStats(userId)
  await pushChecks(userId)
  await pushExtras(userId)
  const gotStats = await pullBodyStats()
  const gotChecks = await pullChecks()
  const gotExtras = await pullExtras()
  if (gotStats || gotChecks || gotExtras) useNutritionStore().reload()
}
