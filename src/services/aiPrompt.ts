import { useUserStore } from '../stores/user';
import { usePlansStore } from '../stores/plans';
import { useWorkoutStore } from '../stores/workout';
import { dbService } from './localDb';
import { TRAINING_MODALITIES, GOALS, TRAINING_LEVELS } from '../constants/modalities';

function getRecentSessionsText(planId: string, limit = 15): string {
  const r = dbService.q(`
    SELECT wl.exercise, wl.week, wl.sets, wl.reps,
      COALESCE((SELECT MAX(s.weight_kg) FROM workout_log_sets s WHERE s.log_sync_id = wl.sync_id AND s.deleted = 0), wl.weight_kg) as best_kg,
      wl.rpe
    FROM workout_log wl
    WHERE wl.exercise != '_day_complete' AND wl.plan_id = ?
    ORDER BY wl.logged_at DESC
    LIMIT ?
  `, [planId, limit]);
  if (!r.length || !r[0].values) return 'No hay sesiones previas registradas.';
  return (r[0].values as any[]).map(row =>
    `- Semana ${row[1]} · ${row[0]}: ${row[2]}x${row[3]} con ${row[4]}kg (RPE ${row[5]})`
  ).join('\n');
}

function getStalledExercisesText(planId: string): string {
  const r = dbService.q(`
    SELECT exercise, week, MAX(best_kg)
    FROM (
      SELECT wl.exercise as exercise, wl.week as week,
        COALESCE((SELECT MAX(s.weight_kg) FROM workout_log_sets s WHERE s.log_sync_id = wl.sync_id AND s.deleted = 0), wl.weight_kg) as best_kg
      FROM workout_log wl
      WHERE wl.exercise != '_day_complete' AND wl.weight_kg > 0 AND wl.plan_id = ?
    )
    GROUP BY exercise, week
    ORDER BY exercise, week
  `, [planId]);
  if (!r.length || !r[0].values) return 'Sin datos suficientes.';

  const byExercise = new Map<string, { week: number; kg: number }[]>();
  for (const row of r[0].values as any[]) {
    const [exercise, week, kg] = row;
    if (!byExercise.has(exercise)) byExercise.set(exercise, []);
    byExercise.get(exercise)!.push({ week: Number(week), kg: Number(kg) });
  }

  const stalled: string[] = [];
  for (const [exercise, points] of byExercise.entries()) {
    points.sort((a, b) => a.week - b.week);
    let streak = 0;
    for (let i = points.length - 1; i > 0; i--) {
      if (points[i].kg === points[i - 1].kg) streak++;
      else break;
    }
    if (streak >= 2) stalled.push(`${exercise} (${streak + 1} semanas en ${points[points.length - 1].kg}kg)`);
  }
  return stalled.length ? stalled.join(', ') : 'Ninguno detectado, progresión saludable.';
}

function getRpeComplianceText(planId: string): string {
  const workoutStore = useWorkoutStore();
  const r = dbService.q(`
    SELECT week, ROUND(AVG(rpe), 1)
    FROM workout_log
    WHERE rpe > 0 AND exercise != '_day_complete' AND plan_id = ?
    GROUP BY week ORDER BY week DESC LIMIT 4
  `, [planId]);
  if (!r.length || !r[0].values) return 'Sin datos suficientes.';

  const diffs: number[] = [];
  for (const row of r[0].values as any[]) {
    const week = Number(row[0]);
    const actual = Number(row[1]);
    const target = workoutStore.getWeekInfo(week)?.rpe_target;
    if (target != null) diffs.push(actual - Number(target));
  }
  if (diffs.length === 0) return 'Sin datos suficientes.';

  const avgDiff = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  if (avgDiff <= -1) return `Sistemáticamente ${Math.abs(avgDiff).toFixed(1)} puntos POR DEBAJO del RPE objetivo (subcargado, puede tolerar más intensidad).`;
  if (avgDiff >= 1) return `Sistemáticamente ${avgDiff.toFixed(1)} puntos POR ENCIMA del RPE objetivo (posible fatiga acumulada, considera moderar la progresión).`;
  return 'Dentro del rango esperado de RPE.';
}

function getVolumeTrendText(planId: string): string {
  const r = dbService.q(`
    SELECT wl.week, SUM(
      COALESCE((SELECT SUM(s.weight_kg * s.reps) FROM workout_log_sets s WHERE s.log_sync_id = wl.sync_id AND s.deleted = 0), wl.sets * wl.reps * wl.weight_kg)
    ) as vol
    FROM workout_log wl
    WHERE wl.exercise != '_day_complete' AND wl.plan_id = ?
    GROUP BY wl.week ORDER BY wl.week DESC LIMIT 4
  `, [planId]);
  if (!r.length || !r[0].values || r[0].values.length < 2) return 'Sin datos suficientes.';

  const vols = (r[0].values as any[]).map(row => Number(row[1]) || 0).reverse();
  const first = vols[0];
  const last = vols[vols.length - 1];
  if (!first) return 'Sin datos suficientes.';

  const pctChange = ((last - first) / first) * 100;
  const dir = pctChange > 5 ? 'subiendo' : pctChange < -5 ? 'bajando' : 'estable';
  return `Volumen semanal ${dir} (${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(0)}% en las últimas ${vols.length} semanas registradas).`;
}

function getRepsComplianceText(planId: string): string {
  const lastWeekRes = dbService.q("SELECT exercise, MAX(week) FROM workout_log WHERE exercise != '_day_complete' AND plan_id = ? GROUP BY exercise", [planId]);
  const lastWeekMap = new Map<string, number>();
  if (lastWeekRes.length && lastWeekRes[0].values) {
    for (const row of lastWeekRes[0].values as any[]) lastWeekMap.set(row[0], Number(row[1]));
  }

  const logRes = dbService.q("SELECT exercise, week, sync_id, reps FROM workout_log WHERE exercise != '_day_complete' AND plan_id = ?", [planId]);
  const setAvgRes = dbService.q("SELECT log_sync_id, AVG(reps) FROM workout_log_sets WHERE deleted = 0 GROUP BY log_sync_id");
  const setAvgMap = new Map<string, number>();
  if (setAvgRes.length && setAvgRes[0].values) {
    for (const row of setAvgRes[0].values as any[]) setAvgMap.set(row[0], Number(row[1]));
  }

  const targetRepsRes = dbService.q(`
    SELECT pe.exercise_name, pe.reps
    FROM plan_exercises pe JOIN training_days td ON pe.training_day_id = td.id
    WHERE td.plan_id = ? AND pe.deleted = 0 AND td.deleted = 0
  `, [planId]);
  const targetMap = new Map<string, number>();
  if (targetRepsRes.length && targetRepsRes[0].values) {
    for (const row of targetRepsRes[0].values as any[]) targetMap.set(row[0], Number(row[1]) || 0);
  }

  const repsAcc = new Map<string, { sum: number; count: number }>();
  if (logRes.length && logRes[0].values) {
    for (const row of logRes[0].values as any[]) {
      const [exercise, week, syncId, reps] = row;
      if (lastWeekMap.get(exercise) !== Number(week)) continue;
      const repsVal = syncId && setAvgMap.has(syncId) ? setAvgMap.get(syncId)! : Number(reps);
      const acc = repsAcc.get(exercise) || { sum: 0, count: 0 };
      acc.sum += repsVal;
      acc.count += 1;
      repsAcc.set(exercise, acc);
    }
  }

  const shortfalls: string[] = [];
  for (const [exercise, acc] of repsAcc.entries()) {
    const target = targetMap.get(exercise);
    if (!target) continue;
    const avgReps = acc.sum / acc.count;
    if (avgReps <= target - 1) shortfalls.push(`${exercise} (${avgReps.toFixed(1)}/${target} reps)`);
  }
  return shortfalls.length ? shortfalls.join(', ') : 'Ninguno, cumpliendo el rango de reps objetivo.';
}

export function generateMasterPrompt() {
  const userStore = useUserStore();
  const plansStore = usePlansStore();
  const p = userStore.profile;
  const history = userStore.stats_history;
  const planId = plansStore.activePlan?.id || null;

  const modalitiesSelected = TRAINING_MODALITIES
    .filter(m => p.modalities.includes(m.id))
    .map(m => m.label)
    .join(', ');

  const goalLabel = GOALS.find(g => g.id === p.goal)?.label || p.goal;
  const levelLabel = TRAINING_LEVELS.find(l => l.id === p.training_level)?.label || p.training_level;

  let trendMsg = "No hay datos suficientes de peso.";
  if (history.length >= 2) {
    const latest = history[0].weight_kg;
    const oldest = history[history.length - 1].weight_kg;
    const diff = (latest - oldest).toFixed(1);
    trendMsg = `Tendencia de peso: ${diff}kg en los últimos ${history.length} registros.`;
  }

  const logsSection = planId ? getRecentSessionsText(planId) : 'No hay sesiones previas registradas.';
  const stalledSection = planId ? getStalledExercisesText(planId) : 'Sin plan activo previo.';
  const rpeSection = planId ? getRpeComplianceText(planId) : 'Sin plan activo previo.';
  const volumeSection = planId ? getVolumeTrendText(planId) : 'Sin plan activo previo.';
  const repsSection = planId ? getRepsComplianceText(planId) : 'Sin plan activo previo.';

  return `Actúa como un Entrenador Experto de Clase Mundial.
Tu objetivo es crear un macrociclo de entrenamiento PROFESIONAL de ${p.plan_duration_weeks || 4} semanas.

CONTEXTO DEL USUARIO:
- Nivel: ${levelLabel || 'Intermedio'}
- Frecuencia: ${p.days_per_week || 4} días por semana
- Duración del Plan: ${p.plan_duration_weeks || 4} semanas
- Edad: ${p.age || 'No especificada'}, Peso: ${p.weight_kg || 'No especificado'}kg, Altura: ${p.height_cm || 'No especificada'}cm
- Objetivo: ${goalLabel || 'Mejora general'}
- ${trendMsg}
- Lesiones: ${p.injuries || 'Ninguna'}

ESTADO ACTUAL (ÚLTIMAS SESIONES DEL PLAN ACTIVO):
${logsSection}

ANÁLISIS DE RENDIMIENTO RECIENTE:
- Ejercicios estancados (3+ semanas sin subir peso): ${stalledSection}
- Cumplimiento de RPE objetivo: ${rpeSection}
- Tendencia de volumen semanal: ${volumeSection}
- Ejercicios por debajo del rango de reps objetivo: ${repsSection}

RESTRICCIÓN DE EQUIPO:
- Solo tengo acceso a: ${modalitiesSelected || 'Cualquier equipo'}

ESTRUCTURA DEL OBJETO JSON:
Genera un JSON siguiendo estas interfaces:

interface Plan {
  name: string;
  training_days: TrainingDay[]; // EXACTAMENTE ${p.days_per_week} DÍAS.
  progression_data: ProgressionWeek[]; // EXACTAMENTE ${p.plan_duration_weeks || 4} SEMANAS.
}

interface TrainingDay {
  day_number: number;
  session_name: string;
  exercises: Exercise[]; // 6-10 ejercicios por día.
}

interface Exercise {
  exercise_name: string;
  exercise_type: 'strength' | 'cardio' | 'isometric';
  sets: number;
  reps: number;
  rest_seconds: number;
  special_notes?: string;
  tempo?: string;
  group_id?: string;
  group_type?: 'superset' | 'finisher' | 'circuit';
  duration_min?: number;
  duration_sec?: number;
  incline_pct?: number;
  speed_kmh?: number;
  intensity_mode?: string;
}

interface ProgressionWeek {
  week_number: number;
  phase: 'adaptation' | 'density' | 'intensity' | 'deload' | 'peaking';
  weight_change_pct: string;
  reps_change: string;
  rpe_target: number;
  system_focus: string;
}

CÓMO FUNCIONA LA PROGRESIÓN DE PESO (IMPORTANTE, LÉELO ANTES DE GENERAR progression_data):
- training_days (los ejercicios) es ÚNICO para todo el plan: los MISMOS ejercicios se entrenan todas las semanas. La variedad y progresión del macrociclo se logran ÚNICAMENTE a través de progression_data (peso, RPE, fase), no cambiando ejercicios semana a semana.
- weight_change_pct de la semana N se aplica sobre el PESO REAL que el usuario efectivamente registró la última vez que entrenó ese ejercicio (semana N-1 o la más reciente disponible), NO sobre un peso teórico ni acumulado desde la semana 1. El sistema es adaptativo: si el usuario no llegó al peso sugerido, la app calcula la siguiente semana sobre lo que realmente levantó, no sobre el plan original.
- Por lo tanto NO calcules pesos absolutos en kg: solo define el % de cambio relativo semana a semana. Porcentajes consecutivos (ej. +2.5% dos semanas seguidas) se acumulan de forma compuesta automáticamente por la app — no necesitas sumarlos tú.
- Usa "maintain" o "0%" para mantener el mismo peso que la semana anterior.
- En semanas de deload usa un % claramente negativo (ej. "-20%") Y phase="deload" — esto además reduce las series a la mitad automáticamente en la app, no lo dupliques bajando "sets" en el JSON.
- Si introduces un ejercicio que no estaba en el plan anterior, no tendrá sugerencia de peso hasta que el usuario lo registre por primera vez; ten esto en cuenta si el usuario ya viene de otro plan.

REGLAS DE ORO:
1. DURACIÓN: Debes incluir datos de progresión para las ${p.plan_duration_weeks || 4} semanas solicitadas. No te detengas en la semana 4.
2. FASES: Organiza el plan en fases lógicas (ej: 2 semanas de adaptación, 4 de intensidad, 1 carga máxima, 1 descarga).
3. CALIDAD: Cada día debe ser un entrenamiento completo y equilibrado.
4. TÉCNICA: Usa duration_sec para tiempos bajo tensión exactos y rest_seconds para descansos.
5. RESPUESTA: Solo el JSON. Sin texto adicional.
6. USA EL ANÁLISIS: Si hay ejercicios estancados, cambia su ángulo/variante o rango de reps en vez de repetir lo mismo. Si el RPE viene sistemáticamente bajo, sé más agresivo con weight_change_pct; si viene alto, modera la progresión o agrega más deloads.

Genera el plan ahora.`;
}
