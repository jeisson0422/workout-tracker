// Tabla de alimentos. Para cambiar una porción o agregar un alimento, edita solo este archivo.
// Los macros son por `per` (gramos, mililitros o unidades, según el alimento).

export type FoodId =
  | 'leche' | 'banano' | 'huevo' | 'claras' | 'pan' | 'mermelada' | 'whey'
  | 'pollo' | 'carne' | 'arroz' | 'frijoles' | 'verdura' | 'aguacate'
  | 'yogur' | 'fruta' | 'avena' | 'camote' | 'papa' | 'masa' | 'mozz'

export interface Macros { kcal: number; p: number; c: number; f: number }

interface Food extends Macros {
  per: number
  /** Texto para mostrar: [cantidad, descripción]. */
  label: (qty: number) => [string, string]
}

const grams = (what: string) => (q: number): [string, string] => [`${q} g`, what]

export const FOODS: Record<FoodId, Food> = {
  leche:     { per: 100, kcal: 50,  p: 3.2,  c: 4.8,  f: 2,    label: q => [`${q} ml`, 'de leche semidescremada, en el café'] },
  banano:    { per: 1,   kcal: 105, p: 1.3,  c: 27,   f: 0.4,  label: () => ['1', 'banano'] },
  huevo:     { per: 1,   kcal: 72,  p: 6.3,  c: 0.4,  f: 4.8,  label: q => [String(q), q === 1 ? 'huevo' : 'huevos'] },
  claras:    { per: 100, kcal: 52,  p: 10.9, c: 0.7,  f: 0.2,  label: q => [`${q} g`, `de claras líquidas${q === 120 ? ' (1/2 taza)' : q === 180 ? ' (3/4 de taza)' : ''}`] },
  pan:       { per: 1,   kcal: 86,  p: 3.5,  c: 14.8, f: 1.4,  label: q => [q === 1.5 ? '1 y media' : String(q), q === 1 ? 'rebanada de pan' : 'rebanadas de pan'] },
  mermelada: { per: 1,   kcal: 40,  p: 0,    c: 10,   f: 0,    label: () => ['1 cda', 'de mermelada de fresa'] },
  whey:      { per: 1,   kcal: 120, p: 25,   c: 4,    f: 1,    label: () => ['1 scoop', 'de proteína con agua (el del envase)'] },
  pollo:     { per: 100, kcal: 165, p: 31,   c: 0,    f: 3.6,  label: grams('de pollo cocido') },
  carne:     { per: 100, kcal: 217, p: 26,   c: 0,    f: 12,   label: grams('de carne molida 90/10, cocida') },
  arroz:     { per: 100, kcal: 130, p: 2.7,  c: 28,   f: 0.3,  label: grams('de arroz cocido') },
  frijoles:  { per: 100, kcal: 130, p: 8.5,  c: 23,   f: 0.5,  label: grams('de frijoles') },
  verdura:   { per: 100, kcal: 33,  p: 2,    c: 6,    f: 0.3,  label: grams('de verdura (brócoli, zanahoria, chile)') },
  aguacate:  { per: 100, kcal: 160, p: 2,    c: 9,    f: 15,   label: grams('de aguacate') },
  yogur:     { per: 100, kcal: 59,  p: 10,   c: 3.6,  f: 0.4,  label: grams('de yogur griego natural') },
  fruta:     { per: 100, kcal: 50,  p: 0.6,  c: 12,   f: 0.2,  label: grams('de fruta') },
  avena:     { per: 100, kcal: 380, p: 13,   c: 67,   f: 7,    label: grams('de avena') },
  camote:    { per: 100, kcal: 90,  p: 2,    c: 21,   f: 0.1,  label: grams('de camote al horno') },
  papa:      { per: 100, kcal: 87,  p: 2,    c: 20,   f: 0.1,  label: grams('de papa al horno') },
  masa:      { per: 100, kcal: 88,  p: 2.2,  c: 18.5, f: 0.9,  label: grams('de masa de maíz cocido (la arepa)') },
  mozz:      { per: 100, kcal: 305, p: 23,   c: 2.5,  f: 23,   label: grams('de mozzarella de bloque, rallada') }
}

export function macrosOf(id: FoodId, qty: number): Macros {
  const food = FOODS[id]
  const r = qty / food.per
  return { kcal: food.kcal * r, p: food.p * r, c: food.c * r, f: food.f * r }
}
