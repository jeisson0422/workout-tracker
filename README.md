# 🏋 Workout Tracker

PWA de seguimiento de entrenamiento con base de datos SQLite embebida. Un solo archivo HTML, sin backend, sin dependencias que instalar — los datos viven en el dispositivo del usuario.

---

## Características

- **SQLite en el navegador** via [sql.js](https://sql.js.org) (WebAssembly) + `localStorage` para persistencia
- **PWA lista para iPhone** — añadir a pantalla de inicio desde Safari funciona como app nativa
- **Macrociclo de 14 semanas** con fases de adaptación, densidad, intensidad, descarga y pico
- **4 días de entrenamiento** configurables: Upper Body Power, Lower Body Density, Push & Finisher, Legs & Glutes
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

### Cambiar la rutina de ejercicios

Desde la app: pantalla **Config → JSON de ejercicios**, pega el nuevo JSON y guarda.

O directamente en el código, edita la constante `DEFAULT_EXERCISES` en el `<script>`:

```json
{
  "days": [
    {
      "day_1": "Nombre del día",
      "exercises": [
        { "exercise_name": "nombre_ejercicio", "sets": 4, "reps": 8 },
        { "exercise_name": "cardio_ejemplo", "duration_minutes": 20, "incline_percentage": 8 }
      ]
    }
  ]
}
```

### Cambiar la progresión semanal

Desde la app: pantalla **Config → JSON de progresión**, pega el nuevo JSON y guarda.

O edita `DEFAULT_PROGRESSION` en el código:

```json
{
  "progression_data": [
    {
      "week_number": 1,
      "phase": "adaptation",
      "weight_change_pct": "0%",
      "reps_change": "baseline",
      "rpe_target": 7,
      "system_focus": "technique_re-entry"
    }
  ]
}
```

Fases disponibles: `adaptation`, `density`, `intensity`, `deload`, `peaking`.

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
