<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { CheckIcon, ChevronDownIcon, PlusIcon, XIcon } from 'lucide-vue-next'
import { haptic } from '../../services/haptics'
import { useNutritionStore, dateOfWeekday } from '../../stores/nutrition'
import { DAY_NAMES, eatenTotal, mealTotal, skipKey } from '../../nutrition/plan'
import { FOODS, macrosOf } from '../../nutrition/foods'

const props = defineProps<{ day: number }>()
const store = useNutritionStore()

const plan = computed(() => store.planFor(props.day))
const date = computed(() => dateOfWeekday(props.day))
const eaten = computed(() => store.checks('meal', date.value))
const skips = computed(() => store.checks('skip', date.value))
const planSums = computed(() => eatenTotal(plan.value, eaten.value, skips.value))
const extras = computed(() => store.extras(date.value))
// Lo comido = comidas del plan marcadas + lo que anotaste fuera del plan (solo calorías y proteína).
const sums = computed(() => ({
  ...planSums.value,
  kcal: planSums.value.kcal + extras.value.reduce((a, e) => a + e.kcal, 0),
  p: planSums.value.p + extras.value.reduce((a, e) => a + e.protein_g, 0)
}))

const adding = ref(false)
const form = reactive({ name: '', kcal: null as number | null, protein: null as number | null })
const canSave = computed(() => form.name.trim().length > 0 && !!form.kcal && form.kcal > 0 && form.kcal <= 5000 && (form.protein ?? 0) >= 0 && (form.protein ?? 0) <= 500)
function saveExtra() {
  if (!canSave.value) return
  store.addExtra(date.value, form.name, form.kcal as number, form.protein ?? 0)
  haptic('success')
  form.name = ''
  form.kcal = null
  form.protein = null
  adding.value = false
}
function removeExtra(id: string) {
  haptic('light')
  store.removeExtra(id)
}
const isSkipped = (mealId: string, food: string) => skips.value.includes(skipKey(mealId, food))
const skippedCount = (mealId: string) => skips.value.filter(k => k.startsWith(mealId + ':')).length
const isToday = computed(() => props.day === store.todayIndex)
const open = reactive<Record<string, boolean>>({})

const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
const pct = (a: number, b: number) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0)

const bars = computed(() => [
  { key: 'p', name: 'Proteína', eaten: sums.value.p, total: plan.value.total.p },
  { key: 'c', name: 'Carbohidratos', eaten: sums.value.c, total: plan.value.total.c },
  { key: 'f', name: 'Grasa', eaten: sums.value.f, total: plan.value.total.f }
])

function toggle(id: string) {
  haptic('light')
  store.toggleCheck('meal', date.value, id)
}
function toggleIngredient(mealId: string, food: string) {
  haptic('light')
  store.toggleCheck('skip', date.value, skipKey(mealId, food))
}
</script>

<template>
  <div>
    <section class="label" :aria-label="`Resumen de ${DAY_NAMES[day]}`">
      <div class="label-head">
        <h2 class="display label-day">{{ DAY_NAMES[day] }}<small v-if="isToday">hoy</small></h2>
        <span class="badge" :class="{ gym: plan.gym }">{{ plan.gym ? 'Día de gym' : 'Descanso' }}</span>
      </div>

      <div class="kcal-row">
        <div>
          <span class="lbl">Calorías del plan</span>
          <div class="display kcal">{{ fmt(plan.total.kcal) }}</div>
        </div>
        <p class="kcal-meta">Comido <b>{{ fmt(sums.kcal) }}</b><br>Meta ~{{ fmt(plan.target) }}</p>
      </div>
      <div class="track" role="progressbar" aria-label="Calorías comidas" :aria-valuenow="pct(sums.kcal, plan.total.kcal)" aria-valuemin="0" aria-valuemax="100">
        <div class="fill k" :style="{ width: pct(sums.kcal, plan.total.kcal) + '%' }"></div>
      </div>

      <ul class="macros">
        <li v-for="b in bars" :key="b.key">
          <span class="mac-name">{{ b.name }}</span>
          <span class="mac-val"><b>{{ Math.round(b.eaten) }}</b> de {{ Math.round(b.total) }} g</span>
          <div class="track thin"><div class="fill" :class="b.key" :style="{ width: pct(b.eaten, b.total) + '%' }"></div></div>
        </li>
      </ul>
      <p class="hint">Marca cada comida cuando la termines y las barras se llenan. Meta de proteína: {{ plan.protTarget }} g.</p>
    </section>

    <ol class="meals">
      <li v-for="m in plan.meals" :key="m.id" class="meal" :class="{ done: eaten.includes(m.id) }">
        <span class="time">{{ m.time }}</span>
        <div class="meal-body">
          <div class="meal-head">
            <button class="meal-name" :aria-expanded="!!open[m.id]" @click="open[m.id] = !open[m.id]">
              <span>{{ m.name }}</span>
              <ChevronDownIcon aria-hidden="true" :class="{ flip: open[m.id] }" />
            </button>
            <button class="chk" :aria-pressed="eaten.includes(m.id)" :aria-label="`${eaten.includes(m.id) ? 'Desmarcar' : 'Marcar como comido'}: ${m.name}`" @click="toggle(m.id)">
              <CheckIcon aria-hidden="true" /><span>{{ eaten.includes(m.id) ? 'Comido' : 'Marcar' }}</span>
            </button>
          </div>
          <p class="meal-stat">
            {{ fmt(mealTotal(m, skips).kcal) }} kcal · {{ Math.round(mealTotal(m, skips).p) }} g de proteína<template v-if="skippedCount(m.id)"> · sin {{ skippedCount(m.id) }} {{ skippedCount(m.id) === 1 ? 'ingrediente' : 'ingredientes' }}</template>
          </p>

          <p v-if="m.libre" class="libre">Come lo que quieras. Apunta a unas <b>{{ m.libre.kcal }} kcal</b> y al menos <b>{{ m.libre.p }} g de proteína</b>.</p>
          <template v-if="open[m.id] && !m.libre">
            <ul class="items">
              <li v-for="it in m.items" :key="it.food" :class="{ off: isSkipped(m.id, it.food) }">
                <label>
                  <input type="checkbox" :checked="!isSkipped(m.id, it.food)" @change="toggleIngredient(m.id, it.food)">
                  <span class="box" aria-hidden="true"><CheckIcon /></span>
                  <span class="q">{{ FOODS[it.food].label(it.qty)[0] }}</span>
                  <span class="n">{{ FOODS[it.food].label(it.qty)[1] }}</span>
                  <span class="kc">{{ Math.round(macrosOf(it.food, it.qty).kcal) }} kcal</span>
                </label>
              </li>
            </ul>
            <p class="hint-skip">Desmarca lo que no comiste y la comida se recalcula.</p>
            <p v-if="m.note" class="note">{{ m.note }}</p>
          </template>
        </div>
      </li>
    </ol>

    <section class="extras" aria-label="Comidas fuera del plan">
      <h3>Fuera del plan</h3>
      <ul v-if="extras.length" class="extra-list">
        <li v-for="e in extras" :key="e.id">
          <div><b>{{ e.name }}</b><span>{{ fmt(e.kcal) }} kcal · {{ Math.round(e.protein_g) }} g de proteína</span></div>
          <button class="x" :aria-label="`Quitar ${e.name}`" @click="removeExtra(e.id)"><XIcon aria-hidden="true" /></button>
        </li>
      </ul>
      <p v-else-if="!adding" class="extra-hint">Si comiste algo que no estaba en el plan, anótalo con tus calorías estimadas.</p>

      <form v-if="adding" class="extra-form" @submit.prevent="saveExtra">
        <label for="ex-name">Qué comiste</label>
        <input id="ex-name" v-model="form.name" type="text" maxlength="80" placeholder="Sándwich de lomo" autocomplete="off">
        <div class="two">
          <div>
            <label for="ex-kcal">Calorías</label>
            <input id="ex-kcal" v-model.number="form.kcal" type="number" min="1" max="5000" step="1" inputmode="numeric" placeholder="700">
          </div>
          <div>
            <label for="ex-p">Proteína (g)</label>
            <input id="ex-p" v-model.number="form.protein" type="number" min="0" max="500" step="1" inputmode="numeric" placeholder="40">
          </div>
        </div>
        <div class="two">
          <button type="button" class="btn ghost" @click="adding = false">Cancelar</button>
          <button type="submit" class="btn btn-primary" :disabled="!canSave">Anotar</button>
        </div>
      </form>
      <button v-else class="btn add" @click="adding = true"><PlusIcon aria-hidden="true" />Anotar comida fuera del plan</button>
    </section>
  </div>
</template>

<style scoped>
.label { margin: 0 16px 16px; padding: 16px; background: var(--bg2); border: 1.5px solid var(--border); border-radius: var(--r); }
.label-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.label-day { margin: 0; font-size: 30px; }
.label-day small { margin-left: 8px; font-size: 14px; font-weight: 600; letter-spacing: 0; color: var(--text3); font-family: var(--font-body); }
.badge { padding: 4px 10px; border: 1.5px solid var(--border2); border-radius: 999px; font-size: 12px; font-weight: 700; color: var(--text2); white-space: nowrap; }
.badge.gym { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }

.kcal-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin: 14px 0 8px; padding-top: 12px; border-top: 3px solid var(--text); }
.lbl { font-size: 13px; font-weight: 600; color: var(--text2); }
.kcal { font-size: 56px; }
.kcal-meta { margin: 0; text-align: right; font-size: 13px; line-height: 1.5; color: var(--text2); }
.kcal-meta b { color: var(--text); font-size: 15px; }

.track { height: 10px; background: var(--bg3); border-radius: 2px; overflow: hidden; }
.track.thin { height: 6px; grid-column: 1 / -1; }
.fill { height: 100%; transition: width .35s; }
.fill.k { background: var(--text); }
.fill.p { background: var(--blue); }
.fill.c { background: var(--amber); }
.fill.f { background: var(--green); }

.macros { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 12px; }
.macros li { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; align-items: baseline; }
.mac-name { font-size: 14px; font-weight: 600; }
.mac-val { font-size: 13px; color: var(--text2); }
.mac-val b { color: var(--text); font-size: 15px; }
.hint { margin: 14px 0 0; padding-top: 10px; border-top: 1.5px solid var(--border); font-size: 13px; line-height: 1.45; color: var(--text2); }

.meals { list-style: none; margin: 0; padding: 0 16px; display: grid; gap: 10px; }
.meal { display: grid; grid-template-columns: 46px 1fr; gap: 10px; padding: 12px; background: var(--bg2); border: 1.5px solid var(--border); border-radius: var(--r); }
.meal.done { border-color: var(--green); }
.time { font-size: 15px; font-weight: 700; padding-top: 6px; font-variant-numeric: tabular-nums; color: var(--text2); }
.meal-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.meal-name { display: inline-flex; align-items: center; gap: 4px; min-height: 40px; padding: 0; background: none; border: none; color: var(--text); font: inherit; font-size: 16px; font-weight: 700; text-align: left; cursor: pointer; }
.meal-name svg { width: 18px; height: 18px; color: var(--text3); transition: transform .2s; flex-shrink: 0; }
.meal-name svg.flip { transform: rotate(180deg); }
.meal-stat { margin: 0; font-size: 13px; color: var(--text2); }
.chk { display: inline-flex; align-items: center; gap: 5px; min-height: 40px; padding: 0 12px; background: transparent; border: 1.5px solid var(--border2); border-radius: 999px; color: var(--text2); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; flex-shrink: 0; }
.chk svg { width: 15px; height: 15px; opacity: .45; }
.chk[aria-pressed='true'] { background: var(--green); border-color: var(--green); color: #fff; }
.chk[aria-pressed='true'] svg { opacity: 1; }
.chk:active { transform: scale(.96); }
.items { list-style: none; margin: 10px 0 0; padding: 0; }
.items li { border-top: 1px solid var(--border); font-size: 14px; }
.items label { position: relative; display: grid; grid-template-columns: 22px 66px 1fr auto; gap: 8px; align-items: center; min-height: 44px; padding: 6px 0; cursor: pointer; }
.items input { position: absolute; opacity: 0; inset: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
.items .box { width: 22px; height: 22px; border: 1.5px solid var(--border2); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: transparent; }
.items .box svg { width: 14px; height: 14px; stroke-width: 3.5; }
.items li:not(.off) .box { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
.items input:focus-visible ~ .box { outline: 3px solid var(--accent2); outline-offset: 2px; }
.items li.off .q, .items li.off .n, .items li.off .kc { color: var(--text3); text-decoration: line-through; }
.hint-skip { margin: 6px 0 0; font-size: 12px; color: var(--text3); }
.items .q { font-weight: 700; }
.items .n { color: var(--text2); min-width: 0; overflow-wrap: anywhere; }
.items .kc { font-size: 12px; color: var(--text3); white-space: nowrap; }
.note { margin: 8px 0 0; font-size: 13px; color: var(--text2); }
.libre { margin: 8px 0 0; font-size: 14px; line-height: 1.45; }
.extras { margin: 18px 16px 0; padding: 14px; background: var(--bg2); border: 1.5px solid var(--border); border-radius: var(--r); }
.extras h3 { margin: 0 0 8px; font-size: 15px; font-weight: 700; }
.extra-hint { margin: 0 0 12px; font-size: 13px; line-height: 1.45; color: var(--text2); }
.extra-list { list-style: none; margin: 0 0 12px; padding: 0; }
.extra-list li { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 0; border-top: 1px solid var(--border); }
.extra-list li:first-child { border-top: none; }
.extra-list b { display: block; font-size: 15px; overflow-wrap: anywhere; }
.extra-list span { font-size: 13px; color: var(--text2); }
.x { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; flex-shrink: 0; background: transparent; border: none; border-radius: 50%; color: var(--text3); cursor: pointer; transition: transform 160ms ease-out; }
.x:active { transform: scale(0.94); }
.x svg { width: 18px; height: 18px; }
.extra-form label { display: block; margin: 0 0 6px; font-size: 13px; font-weight: 600; color: var(--text2); }
.extra-form input { width: 100%; min-width: 0; box-sizing: border-box; padding: 12px; background: var(--bg); border: 1.5px solid var(--border2); border-radius: var(--r2); color: var(--text); font: inherit; font-size: 16px; }
.extra-form .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
.extra-form .btn:disabled { opacity: .45; }
.extra-form .ghost { background: transparent; border: 1.5px solid var(--border2); color: var(--text2); }
.add { display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: 100%; background: transparent; border: 1.5px dashed var(--border2); color: var(--text); }
.add svg { width: 18px; height: 18px; }
:focus-visible { outline: 3px solid var(--accent2); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .fill, .meal-name svg { transition: none; } }
</style>
