# 🏋 Workout Tracker

PWA de seguimiento de entrenamiento con base de datos SQLite embebida. Un solo archivo HTML, sin backend, sin dependencias que instalar — los datos viven en el dispositivo del usuario.

---

## Características

- **SQLite en el navegador** via [sql.js](https://sql.js.org) (WebAssembly) + `localStorage` para persistencia
- **PWA lista para iPhone** — añadir a pantalla de inicio desde Safari funciona como app nativa
- **Macrociclo de 14 semanas** con fases de adaptación, densidad, intensidad, descarga y pico
- **6 días de entrenamiento** con soporte para supersets, trisets, pirámides, finishers, drop sets y más
- **Progresión automática** por semana: ajuste de peso, reps y RPE según la fase
- **Log por ejercicio** — modal distinto para strength, cardio e isométricos
- **Temporizador de descanso** — tiempo recomendado visible en cada ejercicio y en el modal
- **Pantalla Hoy** — muestra automáticamente el día siguiente a entrenar
- **Estadísticas** — sets totales, semanas activas, max squat, RPE promedio, historial
- **Configuración en vivo** — reemplaza los JSON de ejercicios y progresión desde la app
- **Exportar datos** a JSON desde Config
- Sin cuenta, sin servidor, sin cookies, sin tracking

---

## Navegación

| Tab | Función |
|---|---|
| **Inicio** | Resumen del macrociclo, grid de 14 semanas con colores por fase, parámetros de la semana actual |
| **Hoy** | El día siguiente sin completar. Se avanza automáticamente al loguear o con el botón "Marcar día completo" |
| **Semana** | Todos los días del programa. Los días completados muestran el número en verde con ✓ |
| **Stats** | Sets totales, semanas activas, max squat, RPE promedio e historial reciente |
| **Config** | Cambiar semana actual, reemplazar JSON de ejercicios o progresión, exportar datos, borrar todo |

---

## Colores de fases en el grid

| Fase | Color | Estado futuro (tenue) | Estado pasado (sólido) |
|---|---|---|---|
| `adaptation` | Morado | rgba morado 15% | morado sólido |
| `density` | Azul | rgba azul 10% | azul 30% |
| `intensity` | Naranja | rgba naranja 10% | naranja 25% |
| `deload` | Verde | rgba verde 15% | verde sólido |
| `peaking` | Amarillo | rgba amarillo 15% | amarillo sólido |

La semana actual siempre tiene borde doble con glow.

---

## Deploy en Digital Ocean Static Apps

### Estructura del repo

```
/
├── index.html          ← renombrar workout-tracker.html
├── README.md
└── .do/
    └── app.yaml
```

### `.do/app.yaml`

```yaml
name: workout-tracker
static_sites:
- name: workout-tracker
  source_dir: /
  index_document: index.html
  error_document: index.html
  environment_slug: html
```

### Pasos

```bash
git init
git add index.html README.md .do/app.yaml
git commit -m "initial commit"
git remote add origin https://github.com/tu-usuario/workout-tracker.git
git push -u origin main
```

1. Panel de DO → **Create → App** → conectar repo
2. DO detecta el sitio via `.do/app.yaml`
3. **Settings → Domains** → agregar tu dominio + registro CNAME

Cada `git push` a `main` redespliega en ~2 minutos.

### iPhone

Abre tu dominio en Safari → Compartir → **Añadir a pantalla de inicio**

---

## Schemas de configuración

> ⚠️ **Regla crítica**: usar únicamente los valores documentados en este README.
> Valores fuera de las tablas se mostrarán sin estilo o serán ignorados.

---

## Schema: JSON de ejercicios

### Estructura raíz

```json
{
  "routine_metadata": {
    "goal": "string libre",
    "protein_target_grams": 200,
    "daily_water_liters": 3.5,
    "rest_between_sets_seconds": 60,
    "cardio_type": "string libre",
    "cardio_parameters": "string libre"
  },
  "training_days": [
    {
      "day_number": 1,
      "session_name": "Nombre de la sesión",
      "exercises": [ ... ]
    }
  ]
}
```

`day_number` es el día de la semana (1–7). Puede ser no consecutivo (1, 2, 4, 6...).

---

### Estructura de ejercicio — `strength`

```json
{
  "exercise_name": "snake_case",
  "exercise_type": "strength",
  "sets": 4,
  "reps": 8,
  "current_weight_kg": 0,
  "max_safety_limit_kg": null,
  "tempo": "normal",
  "rest_seconds": 60,
  "special_notes": "snake_case_cue",
  "group_id": "A",
  "group_type": "superset"
}
```

### Estructura de ejercicio — `cardio`

```json
{
  "exercise_name": "snake_case",
  "exercise_type": "cardio",
  "intensity_mode": "LISS",
  "duration_min": 15,
  "incline_pct": 10,
  "speed_kmh": 5.0,
  "target_heart_rate_bpm": 130,
  "special_notes": "snake_case_cue"
}
```

### Estructura de ejercicio — `isometric`

```json
{
  "exercise_name": "snake_case",
  "exercise_type": "isometric",
  "sets": 3,
  "duration_sec": 60,
  "rest_seconds": 45,
  "special_notes": "snake_case_cue"
}
```

### Estructura de ejercicio — pirámide

```json
{
  "exercise_name": "snake_case",
  "exercise_type": "strength",
  "sets": 5,
  "pyramid_reps": [12, 10, 8, 6, 4],
  "pyramid_weights_kg": [50, 60, 70, 80, 90],
  "max_safety_limit_kg": 90,
  "rest_seconds": 90,
  "group_id": "C",
  "group_type": "pyramid"
}
```

`sets` debe coincidir con la longitud de los arrays. El modal muestra una fila de input por serie.

---

### Campo `exercise_type` — valores válidos

| Valor | Campos obligatorios | Modal que abre |
|---|---|---|
| `"strength"` | `exercise_name`, `sets`, `reps` | Series, reps, peso, RPE |
| `"cardio"` | `exercise_name`, `duration_min`, `incline_pct` | Duración, inclinación, velocidad, FC |
| `"isometric"` | `exercise_name`, `sets`, `duration_sec` | Series, segundos, RPE |

Si se omite, la app lo infiere por los campos presentes. Siempre declararlo explícitamente.

---

### Campo `tempo` — valores válidos

Solo declarar cuando no es `"normal"`. La app muestra un tag amarillo con el valor.

| Valor | Descripción |
|---|---|
| `"normal"` | Tempo estándar — no muestra tag |
| `"controlled"` | Bajada controlada, subida normal |
| `"slow"` | Todo lento, énfasis en tensión |
| `"explosive"` | Concéntrica explosiva |
| `"isometric"` | Contracción sostenida |
| `"3210"` | 3s baja · 2s pausa · 1s sube · 0s arriba |
| `"4010"` | 4s baja · 0s pausa · 1s sube · 0s arriba |

Cualquier otro string se muestra tal cual. Solo usar los anteriores para consistencia.

---

### Campo `group_type` — valores válidos

| Valor | Color UI | Cuándo usarlo |
|---|---|---|
| `"superset"` | Morado | 2 ejercicios alternados sin descanso |
| `"triset"` | Azul | 3 ejercicios alternados sin descanso |
| `"giant_set"` | Verde | 4 o más ejercicios en circuito |
| `"pyramid"` | Amarillo | Reps y/o peso cambian por serie |
| `"drop_set"` | Rojo | Mismo ejercicio, peso baja cada serie |
| `"finisher"` | Naranja | Ejercicio de cierre solo, al final del día |

**Regla**: no inventar valores nuevos. Si ninguno aplica, omitir `group_id` y `group_type`.

`group_id` puede ser string o número (`"A"`, `"B"`, `1`, `2`). Debe ser igual en todos los ejercicios del grupo.

---

### Campo `intensity_mode` — valores válidos (solo cardio)

| Valor | Descripción |
|---|---|
| `"LISS"` | Low Intensity Steady State |
| `"HIIT"` | High Intensity Interval Training |
| `"MISS"` | Moderate Intensity Steady State |

---

### Campo `rest_seconds` — descanso recomendado

Se muestra en la fila del ejercicio y en el modal. Si se omite, la app usa el default:

| Tipo / `group_type` | Default |
|---|---|
| `"strength"` | 60s |
| `"isometric"` | 45s |
| `"superset"` | 30s |
| `"triset"` | 30s |
| `"giant_set"` | 30s |
| `"finisher"` | 20s |
| `"pyramid"` | 90s |
| `"drop_set"` | 90s |
| `"cardio"` | sin descanso |

**Prioridad**: `rest_seconds` explícito → default por `group_type` → default por `exercise_type`.

---

### Tabla maestra — todos los campos

| Campo | Tipo | Aplica a | Valores válidos |
|---|---|---|---|
| `exercise_name` | `string` | todos | snake_case libre |
| `exercise_type` | `string` | todos | `"strength"` `"cardio"` `"isometric"` |
| `sets` | `number` | strength, isometric | entero positivo |
| `reps` | `number` | strength | entero positivo |
| `duration_min` | `number` | cardio | entero positivo |
| `duration_sec` | `number` | isometric | entero positivo |
| `incline_pct` | `number` | cardio | `0`–`30` |
| `speed_kmh` | `number` | cardio | decimal positivo |
| `target_heart_rate_bpm` | `number` | cardio | `0`–`220` |
| `intensity_mode` | `string` | cardio | `"LISS"` `"HIIT"` `"MISS"` |
| `current_weight_kg` | `number` | strength | decimal positivo o `0` |
| `max_safety_limit_kg` | `number\|null` | strength | decimal positivo o `null` |
| `rest_seconds` | `number` | todos | entero positivo |
| `tempo` | `string` | strength | ver tabla de valores válidos |
| `special_notes` | `string` | todos | snake_case libre (se convierte a espacios en UI) |
| `group_id` | `string\|number` | strength | igual en todos los del grupo |
| `group_type` | `string` | strength | ver tabla de valores válidos |
| `pyramid_reps` | `number[]` | strength pyramid | array de enteros, longitud = `sets` |
| `pyramid_weights_kg` | `number[]` | strength pyramid | array de decimales, longitud = `sets` |

---

### Iconos automáticos por tipo de ejercicio

La app asigna íconos SVG según el nombre del ejercicio. No requiere configuración.

| Patrón en `exercise_name` | Ícono |
|---|---|
| `bench`, `press`, `flye`, `dip` | Pecho / barras horizontales |
| `row`, `pulldown`, `pull`, `lat` | Espalda / flecha atrás |
| `shoulder`, `military`, `lateral`, `raise`, `face_pull` | Hombro / figura con brazos |
| `bicep`, `curl`, `tricep`, `pushdown` | Brazo / músculo |
| `squat`, `leg`, `lunge` | Pierna / figura sentada |
| `hip`, `glute`, `abduction`, `romanian`, `deadlift` | Glúteo / figura de cadera |
| `plank`, `ab`, `core`, `wheel` | Core / rectángulo |
| `burpee`, `jump`, `sprint` | Funcional / rayo |
| `exercise_type: "cardio"` | Cardio / rayo |
| `exercise_type: "isometric"` | Isométrico / cruz en círculo |
| Default strength | Pesas / barra |

---

## Schema: JSON de progresión

### Estructura raíz

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

---

### Campo `phase` — valores válidos

| Valor | Color UI | Descripción |
|---|---|---|
| `"adaptation"` | Morado | Semanas de entrada, técnica y volumen inicial |
| `"density"` | Azul | Acumulación metabólica, más reps |
| `"intensity"` | Naranja | Carga alta, reps base, retención muscular |
| `"deload"` | Verde | Descarga activa — reduce sets a la mitad automáticamente |
| `"peaking"` | Amarillo | Semanas finales, esfuerzo máximo |

---

### Campo `weight_change_pct` — formato válido

Siempre string con signo explícito:

| Valor | Significado |
|---|---|
| `"0%"` | Sin cambio |
| `"+2.5%"` | Subir 2.5% |
| `"+5%"` | Subir 5% |
| `"-20%"` | Bajar 20% (típico deload) |
| `"maintain"` | Mantener peso actual |

---

### Campo `reps_change` — valores válidos

| Valor | Efecto en la UI |
|---|---|
| `"baseline"` | Reps base del JSON de ejercicios |
| `"maintain"` | Sin cambio |
| `"+2 reps"` | Suma 2 a los reps base |
| `"+1 rep"` | Suma 1 a los reps base |
| `"max effort"` | Indicador de esfuerzo máximo |
| `"reduce to baseline"` | Vuelve a reps base |
| `"maintain high reps"` | Mantiene reps aumentados de density |
| `"-50% sets"` | Divide sets a la mitad — solo en deload |

---

### Campo `rpe_target`

Float entre `1.0` y `10.0`. Se muestra en home y en el header de entrenamiento.

---

### Campo `system_focus`

String libre en `snake_case`. Se muestra en inicio como descripción de la semana.

Valores del macrociclo actual:
`technique_re-entry` · `progressive_overload` · `volume_accumulation` · `nervous_system_recovery` · `metabolic_stress` · `work_capacity` · `fat_loss_peak` · `hormonal_reset` · `muscle_retention` · `strength_peak` · `overreach_control` · `final_recovery` · `final_cut_definition` · `target_achievement_88kg`

---

### Ejemplo completo (14 semanas)

```json
{
  "progression_data": [
    { "week_number":  1, "phase": "adaptation", "weight_change_pct": "0%",      "reps_change": "baseline",           "rpe_target": 7.0,  "system_focus": "technique_re-entry" },
    { "week_number":  2, "phase": "adaptation", "weight_change_pct": "+2.5%",   "reps_change": "maintain",           "rpe_target": 7.5,  "system_focus": "progressive_overload" },
    { "week_number":  3, "phase": "adaptation", "weight_change_pct": "+2.5%",   "reps_change": "maintain",           "rpe_target": 8.0,  "system_focus": "volume_accumulation" },
    { "week_number":  4, "phase": "deload",     "weight_change_pct": "-20%",    "reps_change": "-50% sets",          "rpe_target": 5.0,  "system_focus": "nervous_system_recovery" },
    { "week_number":  5, "phase": "density",    "weight_change_pct": "0%",      "reps_change": "+2 reps",            "rpe_target": 8.0,  "system_focus": "metabolic_stress" },
    { "week_number":  6, "phase": "density",    "weight_change_pct": "0%",      "reps_change": "+2 reps",            "rpe_target": 8.5,  "system_focus": "work_capacity" },
    { "week_number":  7, "phase": "density",    "weight_change_pct": "+2.5%",   "reps_change": "maintain high reps", "rpe_target": 9.0,  "system_focus": "fat_loss_peak" },
    { "week_number":  8, "phase": "deload",     "weight_change_pct": "-20%",    "reps_change": "-50% sets",          "rpe_target": 5.0,  "system_focus": "hormonal_reset" },
    { "week_number":  9, "phase": "intensity",  "weight_change_pct": "+5%",     "reps_change": "reduce to baseline", "rpe_target": 8.5,  "system_focus": "muscle_retention" },
    { "week_number": 10, "phase": "intensity",  "weight_change_pct": "+2.5%",   "reps_change": "maintain",           "rpe_target": 9.0,  "system_focus": "strength_peak" },
    { "week_number": 11, "phase": "intensity",  "weight_change_pct": "maintain","reps_change": "+1 rep",             "rpe_target": 9.5,  "system_focus": "overreach_control" },
    { "week_number": 12, "phase": "deload",     "weight_change_pct": "-20%",    "reps_change": "-50% sets",          "rpe_target": 5.0,  "system_focus": "final_recovery" },
    { "week_number": 13, "phase": "peaking",    "weight_change_pct": "maintain","reps_change": "max effort",         "rpe_target": 9.5,  "system_focus": "final_cut_definition" },
    { "week_number": 14, "phase": "peaking",    "weight_change_pct": "maintain","reps_change": "max effort",         "rpe_target": 10.0, "system_focus": "target_achievement_88kg" }
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
  localStorage  ←── clave: wt_db_v2  (binario base64)
```

El `.wasm` de sql.js se carga desde Cloudflare CDN en cada visita. Los datos nunca salen del dispositivo.

### Schema SQLite

```sql
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

CREATE TABLE config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

**Nota sobre cardio**: `reps` guarda la duración en minutos, `weight_kg` guarda la velocidad en km/h, `rpe` guarda la FC real en bpm. Las notas incluyen `incline:X% speed:Xkm/h hr:Xbpm`.

**Nota sobre día completo**: al marcar un día completo manualmente se inserta un registro con `exercise = '_day_complete'`.

---

## Limitaciones conocidas

| Limitación | Detalle |
|---|---|
| Un solo dispositivo | `localStorage` no sincroniza entre dispositivos |
| Sin autenticación | Cualquier persona con acceso al dispositivo ve los datos |
| Límite ~5MB | Límite de `localStorage` en iOS Safari — suficiente para años de logs |
| Primera carga requiere internet | El `.wasm` de sql.js se carga desde CDN |

Para sincronización multi-dispositivo se necesitaría un backend (ej. Supabase + API REST).

---

## Stack técnico

| Componente | Tecnología |
|---|---|
| UI | HTML5 + CSS3 + JS vanilla |
| Base de datos | [sql.js 1.10.2](https://github.com/sql-js/sql.js) — SQLite compilado a WebAssembly |
| Persistencia | `localStorage` (binario base64, clave `wt_db_v2`) |
| Deploy | Digital Ocean Static Apps + `.do/app.yaml` |
| PWA | `apple-mobile-web-app-capable` + `theme-color` meta tags |

---

## Licencia

MIT