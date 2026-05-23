import { useUserStore } from '../stores/user';
import { dbService } from './localDb';
import { TRAINING_MODALITIES, GOALS, TRAINING_LEVELS } from '../constants/modalities';

export function generateMasterPrompt() {
  const userStore = useUserStore();
  const p = userStore.profile;
  const history = userStore.stats_history;
  const workoutLogs = dbService.getRecentLogs(15); 

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

  let logsSection = "No hay sesiones previas registradas.";
  if (workoutLogs.length > 0) {
    logsSection = workoutLogs.map(log => 
      `- ${log.exercise}: ${log.sets}x${log.reps} con ${log.weight_kg}kg (RPE ${log.rpe})`
    ).join('\n');
  }

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

ESTADO ACTUAL (ÚLTIMAS SESIONES):
${logsSection}

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

REGLAS DE ORO:
1. DURACIÓN: Debes incluir datos de progresión para las ${p.plan_duration_weeks || 4} semanas solicitadas. No te detengas en la semana 4.
2. FASES: Organiza el plan en fases lógicas (ej: 2 semanas de adaptación, 4 de intensidad, 1 carga máxima, 1 descarga).
3. CALIDAD: Cada día debe ser un entrenamiento completo y equilibrado.
4. TÉCNICA: Usa duration_sec para tiempos bajo tensión exactos y rest_seconds para descansos.
5. RESPUESTA: Solo el JSON. Sin texto adicional.

Genera el plan ahora.`;
}
