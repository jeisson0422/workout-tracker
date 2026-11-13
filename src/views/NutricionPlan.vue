<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeftIcon } from 'lucide-vue-next'
import { useNutritionStore } from '../stores/nutrition'
import { PACE_LABEL, SHOPPING, PREP_STEPS, PREP_YIELDS, STORAGE_TIPS, type Pace, type DinnerKind } from '../nutrition/plan'
import WeekPanel from '../components/nutrition/WeekPanel.vue'
import NumbersPanel from '../components/nutrition/NumbersPanel.vue'
import ChecklistPanel, { type ChecklistGroup } from '../components/nutrition/ChecklistPanel.vue'

const router = useRouter()
const store = useNutritionStore()

const TABS = [
  { id: 'semana', label: 'Semana' },
  { id: 'super', label: 'Súper' },
  { id: 'domingo', label: 'Domingo' },
  { id: 'numeros', label: 'Números' }
] as const
type TabId = (typeof TABS)[number]['id']
const tab = ref<TabId>('semana')

const PACES: Pace[] = ['mod', 'agr']
const DINNERS: { id: DinnerKind; label: string }[] = [
  { id: 'clasica', label: 'Camote o papa' },
  { id: 'arepa', label: 'Arepa' }
]

const shopGroups = computed<ChecklistGroup[]>(() =>
  SHOPPING.map(g => ({ title: g.group, items: g.items.map(i => ({ id: i.id, title: i.name, aside: i.qty })) }))
)
const prepGroups = computed<ChecklistGroup[]>(() => [{ items: PREP_STEPS.map(s => ({ id: s.id, title: s.title, text: s.text })) }])

// Al elegir un día en la semana, se abre ese día en Comida.
function openDay(day: number) {
  router.push({ path: '/nutricion', query: { dia: String(day) } })
}

function moveTab(e: KeyboardEvent) {
  const i = TABS.findIndex(t => t.id === tab.value)
  const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null
  if (next === null) return
  tab.value = TABS[(next + TABS.length) % TABS.length].id
  document.getElementById('pt-' + tab.value)?.focus()
}
</script>

<template>
  <div class="plan">
    <header class="screen-head head">
      <button class="back-btn" aria-label="Volver a Comida" @click="router.push('/nutricion')"><ChevronLeftIcon aria-hidden="true" /></button>
      <h1 class="display screen-title">Plan completo</h1>
    </header>

    <div v-if="tab === 'semana' || tab === 'numeros'" class="controls">
      <div class="seg" role="group" aria-label="Ritmo de pérdida">
        <span>Ritmo</span>
        <button v-for="p in PACES" :key="p" :aria-pressed="store.pace === p" @click="store.setPace(p)">{{ PACE_LABEL[p] }}</button>
      </div>
      <div class="seg" role="group" aria-label="Tipo de cena">
        <span>Cena</span>
        <button v-for="d in DINNERS" :key="d.id" :aria-pressed="store.dinner === d.id" @click="store.setDinner(d.id)">{{ d.label }}</button>
      </div>
    </div>

    <nav class="tabs" role="tablist" aria-label="Secciones del plan" @keydown="moveTab">
      <button v-for="t in TABS" :id="'pt-' + t.id" :key="t.id" role="tab" :aria-selected="tab === t.id" :tabindex="tab === t.id ? 0 : -1" :aria-controls="'pp-' + t.id" @click="tab = t.id">{{ t.label }}</button>
    </nav>

    <main>
      <section v-if="tab === 'semana'" id="pp-semana" role="tabpanel" aria-labelledby="pt-semana">
        <WeekPanel :selected="store.todayIndex" @select="openDay" />
      </section>

      <section v-else-if="tab === 'super'" id="pp-super" role="tabpanel" aria-labelledby="pt-super">
        <p class="lead">Cantidades para una semana. Lo marcado se guarda en tu cuenta y se reinicia cada lunes.</p>
        <ChecklistPanel kind="shop" :period="store.weekKey" :groups="shopGroups" unit="en el carrito" all-done="Todo en el carrito" />
      </section>

      <section v-else-if="tab === 'domingo'" id="pp-domingo" role="tabpanel" aria-labelledby="pt-domingo">
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

      <section v-else id="pp-numeros" role="tabpanel" aria-labelledby="pt-numeros">
        <NumbersPanel />
      </section>
    </main>

    <p class="foot">Estimaciones aproximadas, calculadas con las etiquetas de tus productos y tablas estándar. Se ajustan con tu peso real.</p>
  </div>
</template>

<style scoped>
.plan { padding-bottom: 28px; }
.head { display: flex; align-items: center; gap: 12px; }
.back-btn { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; padding: 0; background: var(--bg2); border: 1.5px solid var(--border); border-radius: 50%; color: var(--text); cursor: pointer; transition: transform 160ms ease-out; }
.back-btn:active { transform: scale(0.94); }

.controls { display: grid; gap: 8px; margin: 0 16px 12px; }
.seg { display: flex; align-items: center; gap: 6px; }
.seg span { width: 48px; flex-shrink: 0; font-size: 13px; font-weight: 600; color: var(--text2); }
.seg button { flex: 1; min-height: 44px; padding: 0 8px; background: transparent; border: 1.5px solid var(--border2); border-radius: var(--r3); color: var(--text2); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; transition: transform 160ms ease-out; }
.seg button:active { transform: scale(0.97); }
.seg button[aria-pressed='true'] { background: var(--text); border-color: var(--text); color: var(--bg); }

.tabs { display: flex; margin: 0 0 14px; padding: 0 8px; overflow-x: auto; border-bottom: 1.5px solid var(--border); scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tabs button { flex: 1 0 auto; min-height: 44px; padding: 0 12px; background: none; border: none; border-bottom: 3px solid transparent; color: var(--text2); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; margin-bottom: -1.5px; }
.tabs button[aria-selected='true'] { color: var(--text); border-bottom-color: var(--accent); }

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
