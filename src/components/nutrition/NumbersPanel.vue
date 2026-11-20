<script setup lang="ts">
import { computed, ref } from 'vue'
import { haptic } from '../../services/haptics'
import { showToast } from '../../services/toast'
import { copyCoachContext } from '../../services/coachContext'
import { useNutritionStore } from '../../stores/nutrition'
import { useUserStore } from '../../stores/user'
import { DAY_SHORT, DAY_NAMES, ENERGY_REFERENCES, TARGETS, RULES, RAISE_CALORIES_WHEN } from '../../nutrition/plan'

const store = useNutritionStore()
const user = useUserStore()

const MAX_KCAL = 3000
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

const bars = computed(() => {
  const t = TARGETS[store.pace]
  return [
    ...ENERGY_REFERENCES.map(r => ({ ...r, meta: false })),
    { label: 'Meta, día de gym', kcal: t.gym, text: '~' + fmt(t.gym), meta: true },
    { label: 'Meta, día de descanso', kcal: t.rest, text: '~' + fmt(t.rest), meta: true }
  ]
})

const weight = computed(() => store.weight)
const entriesLast14 = computed(() => {
  const limit = Date.now() - 14 * 24 * 60 * 60 * 1000
  return user.stats_history.filter(s => new Date(s.recorded_at).getTime() > limit).length
})

const copying = ref(false)
async function copyContext() {
  if (copying.value) return
  copying.value = true
  await copyCoachContext()
  copying.value = false
}

const newWeight = ref<number | null>(null)
function saveWeight() {
  if (!newWeight.value || newWeight.value <= 0) return
  user.addWeightEntry(newWeight.value)
  haptic('success')
  showToast(`Peso anotado: ${newWeight.value} kg`, 'success')
  newWeight.value = null
  store.tick++
}
</script>

<template>
  <div class="numbers">
    <section class="card">
      <h2>Contexto para Claude</h2>
      <p class="lead">Copia tu plan de entrenamiento, tus comidas, tu peso y lo que marcaste esta semana, leído de Supabase en este momento. Pégalo en un chat de Claude para hacer consultas exactas.</p>
      <button class="btn btn-primary" :disabled="copying" @click="copyContext">{{ copying ? 'Armando contexto…' : 'Copiar contexto' }}</button>
    </section>

    <section class="card">
      <h2>Control de peso</h2>
      <p class="lead">Pésate cada mañana en ayunas. Con dos semanas de datos te digo qué ajustar.</p>

      <div v-if="weight.current !== null" class="avgs">
        <div><span>Esta semana</span><b class="display">{{ weight.current.toFixed(1) }}<small> kg</small></b></div>
        <div v-if="weight.previous !== null"><span>Semana anterior</span><b class="display">{{ weight.previous.toFixed(1) }}<small> kg</small></b></div>
      </div>

      <div v-if="weight.advice" class="advice" :class="weight.advice.tone" aria-live="polite">
        <b>{{ weight.advice.headline }}</b>
        <p>{{ weight.advice.text }}</p>
      </div>
      <p v-else class="empty">
        Todavía no hay dos semanas para comparar. Anota tu peso al menos 3 mañanas por semana.
        Llevas {{ entriesLast14 }} {{ entriesLast14 === 1 ? 'registro' : 'registros' }} en los últimos 14 días.
      </p>

      <form class="weight-form" @submit.prevent="saveWeight">
        <label for="nut-weight">Peso de hoy (kg)</label>
        <div class="row">
          <input id="nut-weight" v-model.number="newWeight" type="number" step="0.1" min="30" max="300" inputmode="decimal" placeholder="94.5">
          <button class="btn btn-primary" type="submit" :disabled="!newWeight">Anotar peso</button>
        </div>
      </form>
    </section>

    <section class="card">
      <h2>Tus días de gym</h2>
      <p class="lead">Marca los días que entrenas. Si registras ejercicios en un día de descanso, ese día cuenta como gym.</p>
      <div class="chips" role="group" aria-label="Días de gym">
        <button v-for="(s, i) in DAY_SHORT" :key="s" class="chip" :aria-pressed="store.gymDays[i]" :aria-label="`${DAY_NAMES[i]}: ${store.gymDays[i] ? 'gym' : 'descanso'}`" @click="store.toggleGymDay(i)">{{ s }}</button>
      </div>
    </section>

    <section class="card">
      <h2>De dónde salen las metas</h2>
      <p class="lead">Son estimaciones. Se afinan con tu peso real, no con lo que marca el reloj.</p>
      <ul class="gbars">
        <li v-for="b in bars" :key="b.label" :class="{ meta: b.meta }">
          <span class="g-name">{{ b.label }}</span><span class="g-val">{{ b.text }}</span>
          <div class="g-track"><div :style="{ width: (b.kcal / MAX_KCAL) * 100 + '%' }"></div></div>
        </li>
      </ul>
      <p class="foot">Proteína objetivo: <b>{{ TARGETS[store.pace].prot }} g</b> al día, en cualquier ritmo. El reloj suele pasarse entre 10 y 30 %, sobre todo con pesas, y no conviene comer de vuelta esas calorías.</p>
    </section>

    <section class="card">
      <h2>Reglas</h2>
      <ul class="plain"><li v-for="r in RULES" :key="r">{{ r }}</li></ul>
      <h3>Cuándo subir calorías</h3>
      <ul class="plain"><li v-for="r in RAISE_CALORIES_WHEN" :key="r">{{ r }}</li></ul>
    </section>
  </div>
</template>

<style scoped>
.numbers { padding: 0 16px; display: grid; gap: 14px; }
.card { padding: 16px; background: var(--bg2); border: 1.5px solid var(--border); border-radius: var(--r); }
h2 { margin: 0 0 4px; font-size: 16px; font-weight: 700; }
h3 { margin: 16px 0 6px; font-size: 14px; font-weight: 700; color: var(--text2); }
.lead { margin: 0 0 12px; font-size: 14px; line-height: 1.5; color: var(--text2); }
.avgs { display: flex; gap: 24px; margin-bottom: 12px; }
.avgs span { display: block; font-size: 12px; color: var(--text3); }
.avgs b { font-size: 34px; }
.avgs small { font-size: 14px; font-family: var(--font-body); letter-spacing: 0; color: var(--text2); }
.advice { padding: 12px 14px; border-left: 4px solid var(--border2); background: var(--bg3); border-radius: 4px; }
.advice.ok { border-left-color: var(--green); }
.advice.warn { border-left-color: var(--amber); }
.advice b { font-size: 15px; }
.advice p { margin: 4px 0 0; font-size: 14px; line-height: 1.5; }
.empty { margin: 0; padding: 12px 14px; background: var(--bg3); border-radius: 6px; font-size: 14px; line-height: 1.5; color: var(--text2); }
.weight-form { margin-top: 14px; }
.weight-form label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: var(--text2); }
.row { display: flex; gap: 10px; }
.row input { flex: 1; min-width: 0; padding: 12px; background: var(--bg); border: 1.5px solid var(--border2); border-radius: var(--r2); color: var(--text); font: inherit; font-size: 16px; }
.row .btn { width: auto; padding: 0 16px; white-space: nowrap; }
.row .btn:disabled { opacity: .45; }

.chips { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.chip { min-height: 44px; background: transparent; border: 1.5px solid var(--border2); border-radius: var(--r3); color: var(--text2); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
.chip[aria-pressed='true'] { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }

.gbars { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.gbars li { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; align-items: baseline; font-size: 14px; }
.g-val { font-weight: 700; font-variant-numeric: tabular-nums; }
.g-track { grid-column: 1 / -1; height: 8px; background: var(--bg3); border-radius: 2px; overflow: hidden; }
.g-track div { height: 100%; background: var(--border2); }
.gbars li.meta .g-track div { background: var(--accent); }
.foot { margin: 14px 0 0; font-size: 13px; line-height: 1.5; color: var(--text2); }
.plain { margin: 0; padding-left: 18px; display: grid; gap: 6px; font-size: 14px; line-height: 1.5; }
:focus-visible { outline: 3px solid var(--accent2); outline-offset: 2px; }
</style>
