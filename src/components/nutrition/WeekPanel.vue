<script setup lang="ts">
import { computed } from 'vue'
import { useNutritionStore } from '../../stores/nutrition'
import { DAY_NAMES } from '../../nutrition/plan'

defineProps<{ selected: number }>()
const emit = defineEmits<{ (e: 'select', day: number): void }>()

const store = useNutritionStore()
const days = computed(() => DAY_NAMES.map((_, i) => store.planFor(i)))
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
</script>

<template>
  <section class="week">
    <p class="lead">Toca un día para ver sus comidas con porciones. Los totales cambian con el ritmo y la cena que elegiste.</p>
    <ul class="list">
      <li v-for="d in days" :key="d.day">
        <button class="row" :class="{ sel: d.day === selected }" @click="emit('select', d.day)">
          <span class="day">
            <b>{{ DAY_NAMES[d.day] }}</b>
            <small>{{ d.gym ? 'Gym' : 'Descanso' }}<template v-if="d.day === store.todayIndex"> · hoy</template></small>
          </span>
          <span class="meals">
            <span><i>Almuerzo</i> {{ d.lunchLabel }}</span>
            <span><i>Cena</i> {{ d.dinnerLabel }}</span>
          </span>
          <span class="nums"><b class="display">{{ fmt(d.total.kcal) }}</b><small>{{ Math.round(d.total.p) }} g prot.</small></span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.week { padding: 0 16px; }
.lead { margin: 0 0 12px; font-size: 14px; line-height: 1.5; color: var(--text2); }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.row { display: grid; grid-template-columns: 92px 1fr auto; gap: 10px; align-items: center; width: 100%; padding: 12px; background: var(--bg2); border: 1.5px solid var(--border); border-radius: var(--r); color: var(--text); font: inherit; text-align: left; cursor: pointer; }
.row.sel { border-color: var(--text); box-shadow: 0 0 0 1.5px var(--text); }
.row:active { transform: scale(.99); }
.day { display: grid; gap: 2px; }
.day b { font-size: 15px; }
.day small, .nums small { font-size: 12px; color: var(--text3); }
.meals { display: grid; gap: 4px; min-width: 0; font-size: 13px; line-height: 1.35; color: var(--text2); }
.meals i { font-style: normal; font-weight: 700; color: var(--text); margin-right: 4px; }
.nums { display: grid; justify-items: end; }
.nums b { font-size: 24px; }
:focus-visible { outline: 3px solid var(--accent2); outline-offset: 2px; }
</style>
