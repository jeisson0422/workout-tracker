<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNutritionStore } from '../stores/nutrition'
import { useWorkoutStore } from '../stores/workout'
import { DAY_SHORT, DAY_NAMES, PACE_LABEL, SHOPPING, PREP_STEPS, PREP_YIELDS, STORAGE_TIPS, type Pace, type DinnerKind } from '../nutrition/plan'
import DayPanel from '../components/nutrition/DayPanel.vue'
import WeekPanel from '../components/nutrition/WeekPanel.vue'
import NumbersPanel from '../components/nutrition/NumbersPanel.vue'
import ChecklistPanel, { type ChecklistGroup } from '../components/nutrition/ChecklistPanel.vue'

const store = useNutritionStore()
const workout = useWorkoutStore()

const TABS = [
  { id: 'dia', label: 'Día' },
  { id: 'semana', label: 'Semana' },
  { id: 'super', label: 'Súper' },
  { id: 'domingo', label: 'Domingo' },
  { id: 'numeros', label: 'Números' }
] as const
type TabId = (typeof TABS)[number]['id']

const tab = ref<TabId>('dia')
const day = ref(store.todayIndex)

const PACES: Pace[] = ['mod', 'agr']
const DINNERS: { id: DinnerKind; label: string }[] = [
  { id: 'clasica', label: 'Camote o papa' },
  { id: 'arepa', label: 'Arepa' }
]

const info = computed(() => workout.getWeekInfo(workout.currentWeek))
const phaseKey = computed(() => (info.value.phase || 'density').toLowerCase())
const PHASE_LABELS: Record<string, string> = { adaptation: 'Adaptación', density: 'Densidad', intensity: 'Intensidad', deload: 'Descarga', peaking: 'Pico' }

const shopGroups = computed<ChecklistGroup[]>(() =>
  SHOPPING.map(g => ({ title: g.group, items: g.items.map(i => ({ id: i.id, title: i.name, aside: i.qty })) }))
)
const prepGroups = computed<ChecklistGroup[]>(() => [{ items: PREP_STEPS.map(s => ({ id: s.id, title: s.title, text: s.text })) }])

function pickFromWeek(d: number) {
  day.value = d
  tab.value = 'dia'
  window.scrollTo({ top: 0 })
}

function moveTab(e: KeyboardEvent) {
  const i = TABS.findIndex(t => t.id === tab.value)
  const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null
  if (next === null) return
  tab.value = TABS[(next + TABS.length) % TABS.length].id
  document.getElementById('nt-' + tab.value)?.focus()
}
</script>

<template>
  <div class="nutri">
    <header class="screen-head">
      <p class="when" :class="'ph-' + phaseKey">
        <span class="phase-swatch" aria-hidden="true"></span>
        Semana {{ workout.currentWeek }} · {{ PHASE_LABELS[phaseKey] || phaseKey }}
      </p>
      <h1 class="display screen-title">Nutrición</h1>
      <p class="screen-sub">Qué comer cada día, ligado a tu entrenamiento.</p>
    </header>

    <p v-if="store.phaseTip" class="tip" :class="'ph-' + phaseKey">{{ store.phaseTip }}</p>

    <div v-if="tab === 'dia' || tab === 'semana' || tab === 'numeros'" class="controls">
      <div class="seg" role="group" aria-label="Ritmo de pérdida">
        <span>Ritmo</span>
        <button v-for="p in PACES" :key="p" :aria-pressed="store.pace === p" @click="store.setPace(p)">{{ PACE_LABEL[p] }}</button>
      </div>
      <div class="seg" role="group" aria-label="Tipo de cena">
        <span>Cena</span>
        <button v-for="d in DINNERS" :key="d.id" :aria-pressed="store.dinner === d.id" @click="store.setDinner(d.id)">{{ d.label }}</button>
      </div>
    </div>

    <nav class="tabs" role="tablist" aria-label="Secciones de nutrición" @keydown="moveTab">
      <button v-for="t in TABS" :id="'nt-' + t.id" :key="t.id" role="tab" :aria-selected="tab === t.id" :tabindex="tab === t.id ? 0 : -1" :aria-controls="'np-' + t.id" @click="tab = t.id">{{ t.label }}</button>
    </nav>

    <main>
      <section v-show="tab === 'dia'" id="np-dia" role="tabpanel" aria-labelledby="nt-dia">
        <div class="days" role="group" aria-label="Día de la semana">
          <button v-for="(s, i) in DAY_SHORT" :key="s" class="day" :class="{ today: i === store.todayIndex }" :aria-pressed="day === i" :aria-label="`${DAY_NAMES[i]}${i === store.todayIndex ? ', hoy' : ''}`" @click="day = i">
            <b>{{ s }}</b><span>{{ store.planFor(i).gym ? 'gym' : 'desc.' }}</span>
          </button>
        </div>
        <DayPanel :day="day" />
      </section>

      <section v-show="tab === 'semana'" id="np-semana" role="tabpanel" aria-labelledby="nt-semana">
        <WeekPanel :selected="day" @select="pickFromWeek" />
      </section>

      <section v-if="tab === 'super'" id="np-super" role="tabpanel" aria-labelledby="nt-super">
        <p class="lead">Cantidades para una semana. Lo marcado se guarda en tu cuenta y se reinicia cada lunes.</p>
        <ChecklistPanel kind="shop" :period="store.weekKey" :groups="shopGroups" unit="en el carrito" all-done="Todo en el carrito" />
      </section>

      <section v-if="tab === 'domingo'" id="np-domingo" role="tabpanel" aria-labelledby="nt-domingo">
        <p class="lead">Unas 2 a 2.5 horas. Cubre almuerzos y cenas de lunes a jueves, y deja porciones congeladas para viernes y sábado.</p>
        <h2 class="sub">Qué cocinas y cuánto rinde</h2>
        <ul class="yields">
          <li v-for="y in PREP_YIELDS" :key="y.food">
            <b>{{ y.food }}</b>
            <span>{{ y.raw }} crudo · {{ y.cooked }}</span>
            <span class="por">{{ y.portions }}</span>
          </li>
        </ul>
        <h2 class="sub">Orden de cocción</h2>
        <ChecklistPanel kind="prep" :period="store.weekKey" :groups="prepGroups" ordered unit="pasos" all-done="Todo listo" />
        <h2 class="sub">Conservación</h2>
        <ul class="plain"><li v-for="t in STORAGE_TIPS" :key="t">{{ t }}</li></ul>
      </section>

      <section v-show="tab === 'numeros'" id="np-numeros" role="tabpanel" aria-labelledby="nt-numeros">
        <NumbersPanel />
      </section>
    </main>

    <p class="foot">Estimaciones aproximadas, calculadas con las etiquetas de tus productos y tablas estándar. Se ajustan con tu peso real.</p>
  </div>
</template>

<style scoped>
.nutri { padding-bottom: 28px; }
.when { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-size: 14px; color: var(--text2); }
.phase-swatch { width: 14px; height: 14px; border-radius: 50%; background: var(--ph); box-shadow: inset 0 0 0 3px var(--bg), 0 0 0 1.5px var(--ph); flex-shrink: 0; }
.tip { margin: 0 16px 14px; padding: 2px 0 2px 14px; border-left: 4px solid var(--ph); font-size: 14px; line-height: 1.5; }

.controls { display: grid; gap: 8px; margin: 0 16px 12px; }
.seg { display: flex; align-items: center; gap: 6px; }
.seg span { width: 48px; flex-shrink: 0; font-size: 13px; font-weight: 600; color: var(--text2); }
.seg button { flex: 1; min-height: 44px; padding: 0 8px; background: transparent; border: 1.5px solid var(--border2); border-radius: var(--r3); color: var(--text2); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
.seg button[aria-pressed='true'] { background: var(--text); border-color: var(--text); color: var(--bg); }

.tabs { display: flex; gap: 0; margin: 0 0 14px; padding: 0 8px; overflow-x: auto; border-bottom: 1.5px solid var(--border); scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tabs button { flex: 1 0 auto; min-height: 44px; padding: 0 10px; background: none; border: none; border-bottom: 3px solid transparent; color: var(--text2); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; margin-bottom: -1.5px; }
.tabs button[aria-selected='true'] { color: var(--text); border-bottom-color: var(--accent); }

.days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin: 0 16px 14px; }
.day { display: grid; gap: 1px; min-height: 48px; padding: 5px 0; background: transparent; border: 1.5px solid var(--border2); border-radius: var(--r3); color: var(--text2); font: inherit; line-height: 1.15; cursor: pointer; }
.day b { font-size: 14px; }
.day span { font-size: 10px; }
.day.today b { text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; }
.day[aria-pressed='true'] { background: var(--text); border-color: var(--text); color: var(--bg); }

.lead { margin: 0 16px 14px; font-size: 14px; line-height: 1.5; color: var(--text2); }
.sub { margin: 20px 16px 8px; font-size: 15px; font-weight: 700; }
.yields { list-style: none; margin: 0 16px 6px; padding: 0; background: var(--bg2); border: 1.5px solid var(--border); border-radius: var(--r); overflow: hidden; }
.yields li { display: grid; gap: 2px; padding: 11px 12px; font-size: 14px; }
.yields li + li { border-top: 1px solid var(--border); }
.yields span { color: var(--text2); font-size: 13px; }
.yields .por { color: var(--text); font-weight: 600; }
.plain { margin: 0 16px; padding-left: 18px; display: grid; gap: 6px; font-size: 14px; line-height: 1.5; }
.foot { margin: 22px 16px 0; font-size: 12px; line-height: 1.5; color: var(--text3); }
:focus-visible { outline: 3px solid var(--accent2); outline-offset: 2px; }
</style>
