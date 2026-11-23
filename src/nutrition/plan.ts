// Plan de comidas. Todo lo editable (metas, rotación, porciones, súper, preparación) vive aquí.
// Días de la semana: 0 = lunes ... 6 = domingo.

import { macrosOf, type FoodId, type Macros } from './foods'

export type Pace = 'mod' | 'agr'
export type DinnerKind = 'clasica' | 'arepa'

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** Días de gym por defecto. Se puede cambiar desde la pantalla (config `nutri_gym_days`). */
export const DEFAULT_GYM_DAYS = [true, true, false, true, true, true, false]

export const TARGETS: Record<Pace, { gym: number; rest: number; prot: number }> = {
  mod: { gym: 2100, rest: 1900, prot: 180 },
  agr: { gym: 1950, rest: 1750, prot: 185 }
}

export const PACE_LABEL: Record<Pace, string> = { mod: 'Moderado', agr: 'Agresivo' }

/** Referencias de gasto para la tarjeta "De dónde salen las metas". */
export const ENERGY_REFERENCES = [
  { label: 'Metabolismo basal (fórmulas)', kcal: 1880, text: '1,870 a 1,890' },
  { label: 'Metabolismo basal (reloj)', kcal: 2050, text: '~2,050' },
  { label: 'Gasto, día normal', kcal: 2575, text: '2,500 a 2,650' },
  { label: 'Gasto, día de gym', kcal: 2675, text: '2,600 a 2,750' }
]

/** [proteína del almuerzo, proteína de la cena, tubérculo de la cena]. null = día libre. */
type Rotation = [FoodId, FoodId, FoodId] | null
const ROTATION: Rotation[] = [
  ['pollo', 'carne', 'camote'],
  ['carne', 'pollo', 'papa'],
  ['pollo', 'carne', 'camote'],
  ['pollo', 'carne', 'camote'],
  ['pollo', 'pollo', 'papa'],
  ['carne', 'pollo', 'papa'],
  null
]
const PROTEIN_NAME: Record<string, string> = { pollo: 'Pollo', carne: 'Carne molida' }

export interface MealItem { food: FoodId; qty: number }
export interface Meal {
  id: string
  time: string
  name: string
  items: MealItem[]
  note?: string
  /** Comida libre: sin ingredientes, solo una meta aproximada. */
  libre?: Macros
  total: Macros
}
export interface DayPlan {
  day: number
  gym: boolean
  meals: Meal[]
  total: Macros
  target: number
  protTarget: number
  lunchLabel: string
  dinnerLabel: string
}

function portions(pace: Pace, gym: boolean) {
  const agr = pace === 'agr'
  return {
    arroz: agr ? 100 : 150,
    tuber: gym ? (agr ? 150 : 200) : 100,
    pan: gym ? (agr ? 1.5 : 2) : 1,
    aguacate: agr ? 25 : 50,
    claras: agr ? 180 : 120
  }
}

const sum = (list: Macros[]): Macros =>
  list.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { kcal: 0, p: 0, c: 0, f: 0 })

function meal(m: Omit<Meal, 'total'>): Meal {
  const total = m.libre ?? sum(m.items.map(i => macrosOf(i.food, i.qty)))
  return { ...m, total }
}
const items = (...list: [FoodId, number][]): MealItem[] => list.map(([food, qty]) => ({ food, qty }))

export function buildDay(day: number, pace: Pace, dinner: DinnerKind, gymDays = DEFAULT_GYM_DAYS): DayPlan {
  const gym = gymDays[day]
  const q = portions(pace, gym)
  const rot = ROTATION[day]
  const meals: Meal[] = []

  meals.push(meal({
    id: '0730', time: '7:30', name: 'Antes de entrenar',
    items: items(['leche', 35], ...(gym ? [['banano', 1] as [FoodId, number]] : []))
  }))
  meals.push(meal({
    id: '1000', time: '10:00', name: 'Desayuno después del gym',
    items: items(['huevo', 2], ['claras', q.claras], ['pan', q.pan], ['mermelada', 1], ['whey', 1], ['leche', 110]),
    note: 'Cocina huevos y claras con spray, sin mantequilla. Bate el scoop con 110 ml de leche y 110 ml de agua.'
  }))
  meals.push(rot
    ? meal({ id: '1400', time: '14:00', name: 'Almuerzo', items: items([rot[0], 130], ['arroz', q.arroz], ['frijoles', 100], ['verdura', 150], ['aguacate', q.aguacate]) })
    : meal({ id: '1400', time: '14:00', name: 'Almuerzo libre', items: [], libre: { kcal: 600, p: 40, c: 60, f: 20 } }))
  meals.push(meal({ id: '1700', time: '17:00', name: 'Merienda', items: items(['yogur', 200], ['fruta', 100], ['leche', 35]) }))
  if (rot) {
    const base: [FoodId, number][] = [[rot[1], 130]]
    if (dinner === 'arepa') base.push(['masa', 114], ['mozz', 30])
    else base.push([rot[2], q.tuber])
    base.push(['verdura', 150])
    meals.push(meal({ id: '2000', time: '20:00', name: dinner === 'arepa' ? 'Cena con arepa' : 'Cena', items: items(...base) }))
  } else {
    meals.push(meal({ id: '2000', time: '20:00', name: 'Cena libre', items: [], libre: { kcal: 550, p: 40, c: 50, f: 20 } }))
  }

  const T = TARGETS[pace]
  return {
    day, gym, meals,
    total: sum(meals.map(m => m.total)),
    target: gym ? T.gym : T.rest,
    protTarget: T.prot,
    lunchLabel: rot ? `${PROTEIN_NAME[rot[0]]}, arroz, frijoles` : 'Libre, ~600 kcal',
    dinnerLabel: rot ? `${PROTEIN_NAME[rot[1]]}, ${dinner === 'arepa' ? 'arepa con mozzarella' : rot[2]}` : 'Libre, ~550 kcal'
  }
}

/** Clave de un ingrediente omitido: '<idComida>:<alimento>', por ejemplo '0730:banano'. */
export const skipKey = (mealId: string, food: string) => `${mealId}:${food}`

/** Macros de una comida sin los ingredientes omitidos. Las comidas libres no tienen ingredientes. */
export function mealTotal(m: Meal, skipped: string[] = []): Macros {
  if (m.libre) return m.libre
  return sum(m.items.filter(i => !skipped.includes(skipKey(m.id, i.food))).map(i => macrosOf(i.food, i.qty)))
}

/** Suma de lo que ya comiste según las comidas marcadas, sin lo que omitiste. */
export function eatenTotal(plan: DayPlan, eatenIds: string[], skipped: string[] = []): Macros {
  return sum(plan.meals.filter(m => eatenIds.includes(m.id)).map(m => mealTotal(m, skipped)))
}

/** Consejos por fase del entrenamiento (claves de plan_progressions.phase). */
export const PHASE_TIPS: Record<string, string> = {
  adaptation: 'Semanas de adaptación: sigue el plan tal cual y acostúmbrate a pesar las porciones.',
  density: 'Fase de densidad: el plan normal funciona. Cuida la proteína y el sueño.',
  intensity: 'Fase de intensidad: no recortes más calorías. Si la fuerza baja, sube un poco los carbohidratos.',
  deload: 'Semana de descarga: mantén las calorías, sin recortar más.',
  peaking: 'Fase de pico: no recortes más y sube un poco los carbohidratos si lo necesitas.'
}

export const SHOPPING: { group: string; items: { id: string; name: string; qty: string }[] }[] = [
  { group: 'Proteínas', items: [
    { id: 'huevos', name: 'Huevos', qty: '18' },
    { id: 'claras', name: 'Claras líquidas', qty: '~1 L' },
    { id: 'pollo', name: 'Pollo, pechuga o muslo sin piel', qty: '1.2 kg' },
    { id: 'carne', name: 'Carne molida 90/10', qty: '700 g' },
    { id: 'atun', name: 'Atún en lata', qty: '2 latas' },
    { id: 'yogur', name: 'Yogur Dos Pinos Griego Plus (vasitos de 200 ml)', qty: '2 cajas (8 vasitos)' },
    { id: 'whey', name: 'Proteína en polvo', qty: '7 scoops' }
  ] },
  { group: 'Carbohidratos', items: [
    { id: 'pan', name: 'Pan', qty: '14 rebanadas' },
    { id: 'arroz', name: 'Arroz', qty: '~500 g' },
    { id: 'frijoles', name: 'Frijoles', qty: '1 bolsa o lata' },
    { id: 'camote', name: 'Camote', qty: '1 kg' },
    { id: 'papa', name: 'Papa', qty: '1 kg' },
    { id: 'bananos', name: 'Bananos', qty: '5' },
    { id: 'fruta', name: 'Fruta de temporada', qty: '~700 g' },
    { id: 'maiz', name: 'Maíz pelado para la arepa', qty: 'según uso' }
  ] },
  { group: 'Verduras', items: [
    { id: 'brocoli', name: 'Brócoli', qty: '2 cabezas' },
    { id: 'zanahoria', name: 'Zanahoria', qty: '~500 g' },
    { id: 'chile', name: 'Chile dulce', qty: '3' },
    { id: 'cebolla', name: 'Cebolla', qty: '3' },
    { id: 'tomate', name: 'Tomate', qty: '4' },
    { id: 'pepino', name: 'Pepino', qty: '2' },
    { id: 'repollo', name: 'Repollo', qty: '1 pequeño' },
    { id: 'limones', name: 'Limones', qty: '6' }
  ] },
  { group: 'Grasas y otros', items: [
    { id: 'aguacate', name: 'Aguacate', qty: '3 a 4' },
    { id: 'mozz', name: 'Mozzarella de bloque', qty: '60 g' },
    { id: 'mermelada', name: 'Mermelada de fresa', qty: '7 cdas' },
    { id: 'leche', name: 'Leche semidescremada', qty: '~1.3 L' },
    { id: 'cafe', name: 'Café', qty: 'al gusto' },
    { id: 'spray', name: 'Spray de aceite de coco', qty: '1 lata' },
    { id: 'ajo', name: 'Ajo y especias', qty: 'al gusto' },
    { id: 'creatina', name: 'Creatina (opcional)', qty: '35 g' }
  ] }
]

export const PREP_YIELDS = [
  { food: 'Pollo, pechuga o muslo sin piel', raw: '1.2 kg', cooked: '~900 g', portions: '6 a 7 de 130 g' },
  { food: 'Carne molida 90/10, en picadillo', raw: '700 g', cooked: '~500 g', portions: '4 de 130 g' },
  { food: 'Arroz', raw: '2 a 2.5 tazas', cooked: '~1 kg', portions: '6 de 150 g' },
  { food: 'Camote y papa', raw: '1 kg de cada uno', cooked: 'al horno', portions: '200 g por cena' },
  { food: 'Frijoles', raw: '1 bolsa o lata', cooked: 'cocidos', portions: '100 g por almuerzo' },
  { food: 'Verduras: brócoli, zanahoria, chile dulce', raw: '~1.2 kg', cooked: 'al horno', portions: '150 g por comida' }
]

export const PREP_STEPS: { id: string; title: string; text: string }[] = [
  { id: 'horno', title: 'Prepara el horno y los tubérculos', text: 'Horno a 200 °C. Pica 1 kg de camote y 1 kg de papa en cubos, con spray (3 a 5 segundos por bandeja). Entran primero, unos 35 a 40 minutos.' },
  { id: 'arroz', title: 'Pon el arroz', text: '2 a 2.5 tazas en la olla arrocera desde el inicio.' },
  { id: 'pollo', title: 'Marina y hornea el pollo', text: 'Ajo, limón, comino, chile dulce, sal y pimienta. Unos 25 a 30 minutos en otra bandeja.' },
  { id: 'verduras', title: 'Hornea las verduras', text: 'Brócoli, zanahoria y chile dulce en una tercera bandeja con spray, 15 a 20 minutos.' },
  { id: 'picadillo', title: 'Haz el picadillo', text: '700 g de carne molida con cebolla, chile dulce y tomate, en sartén, mientras el horno trabaja.' },
  { id: 'empaca', title: 'Pesa y empaca', text: 'Pesa cada porción: 130 g de proteína, 150 g de arroz, 100 g de frijoles, 150 g de verdura, 200 g de camote o papa.' },
  { id: 'guarda', title: 'Refrigera y congela', text: 'Refrigera lo de lunes a miércoles. Congela lo de jueves, viernes y sábado.' }
]

export const STORAGE_TIPS = [
  'Refrigerador para lunes a miércoles. Aguanta 3 a 4 días.',
  'Congelador para lo del jueves, viernes y sábado.',
  'Enfría rápido: no dejes el arroz ni la carne más de 1 a 2 horas a temperatura ambiente.',
  'Recalienta hasta que estén bien calientes por dentro.',
  'La ensalada se arma fresca el día que la comes.'
]

export const RAISE_CALORIES_WHEN = [
  'Pierdes fuerza en banca, sentadilla o peso muerto en 2 sesiones seguidas.',
  'Los mismos pesos te cuestan más (el RPE sube).',
  'Duermes mal, estás irritable o con hambre constante.',
  'Bajas más de 1 kg por semana.'
]

export const RULES = [
  'Evalúa cada 2 semanas, no cada día. El peso sube y baja por agua.',
  'Camina unos 7,000 pasos al día: 15 minutos después del almuerzo y de la cena.',
  'No bajes la proteína aunque recortes calorías.',
  'Si te pasas con el arroz, mejor sobrarte en frijoles o verdura. Llenan más por las mismas calorías.',
  'Ritmo agresivo: sostenlo 4 a 6 semanas y haz 1 a 2 semanas en mantenimiento (~2,600 kcal).',
  'Creatina, 5 g al día con cualquier comida (opcional).'
]
