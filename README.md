# 🏋 Workout Tracker

PWA de seguimiento de entrenamiento con base de datos SQLite embebida. Un solo archivo HTML, sin backend, sin dependencias que instalar — los datos viven en el dispositivo del usuario.

---

## Características

- **SQLite en el navegador** via [sql.js](https://sql.js.org) (WebAssembly) + `localStorage` para persistencia
- **PWA lista para iPhone** — añadir a pantalla de inicio desde Safari funciona como app nativa
- **Macrociclo de 14 semanas** con fases de adaptación, densidad, intensidad, descarga y pico
- **5 días de entrenamiento** configurables: Upper Body Power, Lower Body Density, Push & Finisher, Pull & Core, Legs & Glutes
- **Progresión automática** por semana: ajuste de peso, reps y RPE según la fase
- **Log por ejercicio** — registra series, repeticiones, peso (kg), RPE y notas
- **Estadísticas** — sets totales, semanas activas, max squat, RPE promedio, historial
- **Configuración en vivo** — reemplaza los JSON de ejercicios y progresión desde la app sin tocar código
- **Exportar datos** a JSON desde la pantalla de config
- Sin cuenta, sin servidor, sin cookies, sin tracking

---

## Demo rápida

```
tu-dominio.com/workout-tracker.html
```

Abre en Safari → Compartir → **Añadir a pantalla de inicio**

---

## Estructura del proyecto

```
/
└── workout-tracker.html   ← toda la app en un solo archivo
└── README.md
```

No hay `package.json`, no hay bundler, no hay proceso de build. Es HTML + JS puro.

---

## Deploy en Digital Ocean Static Apps

### 1. Preparar el repositorio

```bash
git init
git add workout-tracker.html README.md
git commit -m "initial commit"
git remote add origin https://github.com/tu-usuario/workout-tracker.git
git push -u origin main
```

### 2. Crear la app en Digital Ocean

1. Panel de DO → **Create → App**
2. Conectar el repositorio de GitHub
3. DO detecta automáticamente el sitio estático
4. En **Output Directory** deja `/` (raíz)
5. En **Index Document** pon `workout-tracker.html` (o renombra el archivo a `index.html`)

### 3. Conectar tu dominio

1. En la app de DO → **Settings → Domains**
2. Añade tu dominio personalizado
3. Agrega el registro CNAME que DO indica en tu DNS

El deploy toma ~2 minutos. Cada `git push` a `main` redespliega automáticamente.

---

## Personalización

Desde la app ve a **Config**, pega el nuevo JSON en el campo correspondiente y toca Guardar. Los cambios son inmediatos y persisten en SQLite.

---

## Schema: JSON de ejercicios

```json
{
  "routine_metadata": {
    "goal": "string",
    "protein_target_grams": 200,
    "daily_water_liters": 3.5,
    "rest_between_sets_seconds": 60,
    "cardio_type": "string",
    "cardio_parameters": "string"
  },
  "training_days": [
    {
      "day_number": 1,
      "session_name": "Nombre de la sesión",
      "exercises": [...]
    }
  ]
}
```

### Tipos de ejercicio (`exercise_type`)

| Valor | Campos requeridos | Campos opcionales |
|---|---|---|
| `"strength"` | `exercise_name`, `sets`, `reps` | `current_weight_kg`, `max_safety_limit_kg`, `tempo`, `special_notes`, `group_id`, `group_type` |
| `"cardio"` | `exercise_name`, `duration_min`, `incline_pct` | `speed_kmh`, `target_heart_rate_bpm`, `intensity_mode`, `special_notes` |
| `"isometric"` | `exercise_name`, `sets`, `duration_sec` | `special_notes` |

### Agrupamiento (`group_id` + `group_type`)

Los ejercicios con el mismo `group_id` se muestran agrupados visualmente con un header y borde de color. Cada `group_type` tiene su propio color en la UI.

| `group_type` | Color | Descripción |
|---|---|---|
| `"superset"` | Morado | 2 ejercicios sin descanso |
| `"triset"` | Azul | 3 ejercicios sin descanso |
| `"giant_set"` | Verde | 4+ ejercicios sin descanso |
| `"pyramid"` | Amarillo | Reps/peso progresivos por serie |
| `"drop_set"` | Rojo | Mismo ejercicio, peso baja cada serie |

Ejercicios sin `group_id` se muestran solos, sin agrupamiento.

### Pirámide (`pyramid_reps` + `pyramid_weights_kg`)

Para pirámides, en lugar de `reps` y `current_weight_kg` se usan arrays paralelos. El modal muestra una fila de input por cada serie.

```json
{
  "exercise_name": "barbell_squat",
  "exercise_type": "strength",
  "sets": 5,
  "pyramid_reps": [12, 10, 8, 6, 4],
  "pyramid_weights_kg": [50, 60, 70, 80, 90],
  "max_safety_limit_kg": 90,
  "group_id": "C",
  "group_type": "pyramid"
}
```

### Campos opcionales y su efecto en la UI

| Campo | Tipo | Efecto |
|---|---|---|
| `current_weight_kg` | `number` | Pre-llena el peso en el modal |
| `max_safety_limit_kg` | `number\|null` | Aviso naranja + confirmación si se supera |
| `is_superset` | — | **Deprecated** — usar `group_id` + `group_type` |
| `tempo` | `string` | Tag amarillo: `normal`, `controlled`, `slow`, `explosive`, `3210`, etc. |
| `special_notes` | `string` | Hint en cursiva (snake_case → espacios) |
| `intensity_mode` | `string` | Tag verde en cardio: `LISS`, `HIIT`, etc. |
| `intensity_notes` | `string` | Hint en cardio |
| `target_heart_rate_bpm` | `number` | Se muestra en la meta del ejercicio |
| `speed_kmh` | `number` | Se muestra en meta y se pre-llena en el modal |

### Ejemplo completo

```json
{
  "routine_metadata": {
    "goal": "fat_loss_88kg_target",
    "protein_target_grams": 200,
    "daily_water_liters": 3.5,
    "rest_between_sets_seconds": 60,
    "cardio_type": "incline_treadmill_walk",
    "cardio_parameters": "15_min_at_10_incline"
  },
  "training_days": [
    {
      "day_number": 1,
      "session_name": "Upper Body",
      "exercises": [
        {
          "exercise_name": "barbell_bench_press",
          "exercise_type": "strength",
          "sets": 4, "reps": 6,
          "current_weight_kg": 80,
          "max_safety_limit_kg": 100,
          "tempo": "explosive",
          "special_notes": "focus_on_explosive_concentric"
        },
        {
          "exercise_name": "bicep_curl",
          "exercise_type": "strength",
          "sets": 3, "reps": 10,
          "current_weight_kg": 14,
          "group_id": "A", "group_type": "superset"
        },
        {
          "exercise_name": "tricep_pushdown",
          "exercise_type": "strength",
          "sets": 3, "reps": 10,
          "current_weight_kg": 20,
          "group_id": "A", "group_type": "superset"
        },
        {
          "exercise_name": "plank",
          "exercise_type": "isometric",
          "sets": 3, "duration_sec": 60,
          "special_notes": "brace_core_neutral_spine"
        },
        {
          "exercise_name": "incline_treadmill_walk",
          "exercise_type": "cardio",
          "intensity_mode": "LISS",
          "duration_min": 15, "incline_pct": 10,
          "speed_kmh": 5.0,
          "target_heart_rate_bpm": 130,
          "special_notes": "post_weight_fat_burn"
        }
      ]
    }
  ]
}
```

## Schema: JSON de progresión

```json
{
  "progression_data": [
    {
      "week_number": 1,
      "phase": "adaptation",
      "weight_change_pct": "0%",
      "reps_change": "baseline",
      "rpe_target": 7.0,
      "system_focus": "technique_re-entry"
    }
  ]
}
```

### Reglas del schema de progresión

**`week_number`** — entero, empieza en 1. El macrociclo actual es de 14 semanas.

**`phase`** — uno de estos valores exactos:

| Valor | Descripción |
|---|---|
| `adaptation` | Semanas de entrada, técnica y volumen inicial |
| `density` | Acumulación metabólica, más reps |
| `intensity` | Carga alta, reps base, retención muscular |
| `deload` | Descarga activa, 50% volumen |
| `peaking` | Semanas finales, esfuerzo máximo |

La fase `deload` se detecta por este campo — no hay booleano separado.

**`weight_change_pct`** — siempre string con signo explícito:
`"0%"` · `"+2.5%"` · `"+5%"` · `"-20%"` · `"maintain"`

**`reps_change`** — valores que la app interpreta automáticamente:

| Valor | Efecto en la UI |
|---|---|
| `baseline` | Muestra reps base del ejercicio |
| `maintain` | Sin cambio |
| `+2 reps` | Suma 2 a los reps base |
| `+1 rep` | Suma 1 a los reps base |
| `max effort` | Indicador visual de esfuerzo máximo |
| `reduce to baseline` | Vuelve a reps base |
| `maintain high reps` | Mantiene reps aumentados |
| `-50% sets` | Divide sets a la mitad (deload) |

**`rpe_target`** — float entre 1.0 y 10.0.

**`system_focus`** — string libre en snake_case, se muestra en la pantalla de inicio como contexto de la semana. Ejemplos: `technique_re-entry`, `fat_loss_peak`, `hormonal_reset`.

**Ejemplo de macrociclo completo (4 semanas):**

```json
{
  "progression_data": [
    { "week_number": 1, "phase": "adaptation",  "weight_change_pct": "0%",   "reps_change": "baseline",         "rpe_target": 7.0, "system_focus": "technique_re-entry" },
    { "week_number": 2, "phase": "adaptation",  "weight_change_pct": "+2.5%","reps_change": "maintain",          "rpe_target": 7.5, "system_focus": "progressive_overload" },
    { "week_number": 3, "phase": "density",     "weight_change_pct": "0%",   "reps_change": "+2 reps",           "rpe_target": 8.0, "system_focus": "metabolic_stress" },
    { "week_number": 4, "phase": "deload",      "weight_change_pct": "-20%", "reps_change": "-50% sets",         "rpe_target": 5.0, "system_focus": "nervous_system_recovery" }
  ]
}
```

---

## Cómo funcionan los datos

```
Acción del usuario
      │
      ▼
  sql.js (SQLite WebAssembly)
      │
      ▼
  localStorage  ←─── clave: wt_db_v2  (binario base64)
```

El archivo `.wasm` de sql.js se carga desde el CDN de Cloudflare en cada visita. Los datos nunca salen del dispositivo.

### Schema de la base de datos

```sql
-- Registros de entrenamiento
CREATE TABLE workout_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    week        INTEGER NOT NULL,
    day_label   TEXT NOT NULL,
    exercise    TEXT NOT NULL,
    sets        INTEGER DEFAULT 0,
    reps        INTEGER DEFAULT 0,
    weight_kg   REAL    DEFAULT 0,
    rpe         REAL    DEFAULT 0,
    notes       TEXT    DEFAULT '',
    logged_at   TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M','now','localtime'))
);

-- Configuración persistente (semana actual, JSON de rutina, JSON de progresión)
CREATE TABLE config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

---

## Limitaciones conocidas

| Limitación | Detalle |
|---|---|
| Datos solo en un dispositivo | `localStorage` no se sincroniza entre dispositivos |
| Sin autenticación | Cualquiera con acceso al dispositivo ve los datos |
| Límite ~5MB | Límite de `localStorage` en iOS Safari; suficiente para años de logs |
| Sin modo offline completo | El `.wasm` de sql.js requiere internet en la primera carga |

Para sincronización multi-dispositivo se necesitaría un backend (ej. Supabase + API REST).

---

## Stack técnico

| Componente | Tecnología |
|---|---|
| UI | HTML5 + CSS3 + JS vanilla |
| Base de datos | [sql.js 1.10.2](https://github.com/sql-js/sql.js) (SQLite → WebAssembly) |
| Persistencia | `localStorage` (binario base64) |
| Deploy | Digital Ocean Static Apps |
| PWA | `apple-mobile-web-app-capable` + `theme-color` meta tags |

---

## Licencia

MIT