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

Este es el schema exacto que la app lee. Úsalo como base para construir nuevas rutinas.

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
      "exercises": [
        {
          "exercise_name": "nombre_en_snake_case",
          "sets": 4,
          "reps": 8,
          "current_weight_kg": 0,
          "max_safety_limit_kg": null,
          "is_superset": false,
          "tempo": "normal",
          "special_notes": "string",
          "duration_min": 15,
          "incline_pct": 10,
          "intensity_notes": "string",
          "duration_sec": 60
        }
      ]
    }
  ]
}
```

### Reglas del schema de ejercicios

**`day_number`** — entero del 1 al 7 (día de la semana). Solo se usa como identificador; puedes tener día 1, 2, 4, 6 y saltar los días de descanso.

**`session_name`** — nombre libre de la sesión, se muestra en la app.

**Tipos de ejercicio — usar solo los campos que aplican:**

| Tipo | Campos requeridos | Campos opcionales |
|---|---|---|
| Fuerza / hipertrofia | `exercise_name`, `sets`, `reps` | `current_weight_kg`, `max_safety_limit_kg`, `tempo`, `special_notes`, `is_superset` |
| Cardio (cinta, bike) | `exercise_name`, `duration_min`, `incline_pct` | `intensity_notes` |
| Isométrico (plank, wall sit) | `exercise_name`, `sets`, `duration_sec` | `special_notes` |

Los campos no usados se omiten — no poner `"reps": 0` en un ejercicio de cardio.

**Campos opcionales y su efecto en la UI:**

| Campo | Tipo | Efecto |
|---|---|---|
| `current_weight_kg` | `number` | Pre-llena el campo de peso en el modal de log |
| `max_safety_limit_kg` | `number \| null` | Muestra advertencia si el usuario loguea más kg |
| `is_superset` | `boolean` | Borde lateral morado + tag "superset" |
| `tempo` | `string` | Tag amarillo debajo del nombre (`3210`, `explosive`, `slow`, etc.) |
| `special_notes` | `string` | Hint en cursiva debajo del nombre (snake_case → se convierte a espacios) |
| `intensity_notes` | `string` | Hint en cardio (ej. `target_hr_65_pct`) |

**`tempo` — valores recomendados:**
`normal` · `controlled` · `slow` · `explosive` · `isometric` · `3210` · `4010` · cualquier string

**Ejemplo completo con los tres tipos:**

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
      "session_name": "Upper Body Power",
      "exercises": [
        {
          "exercise_name": "barbell_bench_press",
          "sets": 4, "reps": 6,
          "current_weight_kg": 80,
          "max_safety_limit_kg": 100,
          "is_superset": false,
          "tempo": "explosive",
          "special_notes": "focus_on_explosive_concentric"
        },
        {
          "exercise_name": "bicep_curl",
          "sets": 3, "reps": 10,
          "current_weight_kg": 14,
          "is_superset": true,
          "special_notes": "superset_with_tricep_pushdown"
        },
        {
          "exercise_name": "tricep_pushdown",
          "sets": 3, "reps": 10,
          "current_weight_kg": 20,
          "is_superset": true,
          "special_notes": "superset_with_bicep_curl"
        },
        {
          "exercise_name": "plank",
          "sets": 3, "duration_sec": 60,
          "special_notes": "brace_core_neutral_spine"
        },
        {
          "exercise_name": "incline_treadmill_walk",
          "duration_min": 15, "incline_pct": 10,
          "intensity_notes": "target_hr_65_pct"
        }
      ]
    }
  ]
}
```

---

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