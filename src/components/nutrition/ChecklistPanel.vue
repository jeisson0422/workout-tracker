<script setup lang="ts">
import { computed } from 'vue'
import { CheckIcon } from 'lucide-vue-next'
import { haptic } from '../../services/haptics'
import { useNutritionStore, type CheckKind } from '../../stores/nutrition'

export interface ChecklistItem { id: string; title: string; aside?: string; text?: string }
export interface ChecklistGroup { title?: string; items: ChecklistItem[] }

// Panel genérico de casillas: lo usan la lista del súper y los pasos de preparación.
// Las casillas viven en `nutrition_checks` y se reinician cada semana (period = lunes).
const props = defineProps<{
  kind: CheckKind
  period: string
  groups: ChecklistGroup[]
  /** Muestra el número de cada paso (solo si el orden importa). */
  ordered?: boolean
  unit: string
  allDone: string
}>()

const store = useNutritionStore()
const checked = computed(() => store.checks(props.kind, props.period))
const total = computed(() => props.groups.reduce((n, g) => n + g.items.length, 0))
const progress = computed(() => (checked.value.length >= total.value ? props.allDone : `${checked.value.length} de ${total.value} ${props.unit}`))
const pct = computed(() => (total.value ? Math.round((checked.value.length / total.value) * 100) : 0))

function toggle(id: string) {
  haptic('light')
  store.toggleCheck(props.kind, props.period, id)
}
const stepNumber = (id: string) => props.groups.flatMap(g => g.items).findIndex(it => it.id === id) + 1
</script>

<template>
  <section class="panel">
    <div class="bar">
      <span class="progress" aria-live="polite">{{ progress }}</span>
      <button class="reset" :disabled="!checked.length" @click="store.clearChecks(kind, period)">Desmarcar todo</button>
    </div>
    <div class="meter" role="progressbar" :aria-label="progress" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100"><div :style="{ width: pct + '%' }"></div></div>

    <div v-for="(g, gi) in groups" :key="gi" class="group">
      <h3 v-if="g.title">{{ g.title }}</h3>
      <ul>
        <li v-for="it in g.items" :key="it.id">
          <label class="item" :class="{ done: checked.includes(it.id) }">
            <input type="checkbox" :checked="checked.includes(it.id)" @change="toggle(it.id)">
            <span class="box" aria-hidden="true"><CheckIcon /></span>
            <span class="body">
              <span class="title"><b v-if="ordered" class="num">{{ stepNumber(it.id) }}</b>{{ it.title }}</span>
              <span v-if="it.text" class="text">{{ it.text }}</span>
            </span>
            <span v-if="it.aside" class="aside">{{ it.aside }}</span>
          </label>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.panel { padding: 0 16px; }
.bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.progress { font-size: 15px; font-weight: 700; }
.reset { min-height: 40px; padding: 0 12px; background: transparent; border: 1.5px solid var(--border2); border-radius: 999px; color: var(--text2); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.reset:disabled { opacity: .4; cursor: default; }
.meter { height: 8px; background: var(--bg3); border-radius: 2px; overflow: hidden; margin-bottom: 16px; }
.meter div { height: 100%; background: var(--accent); transition: width .3s; }
.group { margin-bottom: 18px; }
.group h3 { margin: 0 0 6px; font-size: 14px; font-weight: 700; color: var(--text2); }
ul { list-style: none; margin: 0; padding: 0; background: var(--bg2); border: 1.5px solid var(--border); border-radius: var(--r); overflow: hidden; }
li + li { border-top: 1px solid var(--border); }
.item { position: relative; display: flex; align-items: flex-start; gap: 12px; min-height: 48px; padding: 11px 12px; cursor: pointer; }
.item input { position: absolute; opacity: 0; inset: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
.box { width: 22px; height: 22px; margin-top: 1px; border: 1.5px solid var(--border2); border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: transparent; }
.box svg { width: 14px; height: 14px; stroke-width: 3.5; }
.item.done .box { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
.item input:focus-visible ~ .box { outline: 3px solid var(--accent2); outline-offset: 2px; }
.body { display: grid; gap: 3px; min-width: 0; flex: 1; }
.title { font-size: 15px; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; }
.item.done .title { color: var(--text3); text-decoration: line-through; }
.num { display: inline-block; min-width: 1.4em; margin-right: 4px; color: var(--text3); }
.text { font-size: 13px; line-height: 1.45; color: var(--text2); }
.aside { font-size: 13px; color: var(--text2); white-space: nowrap; padding-top: 2px; }
@media (prefers-reduced-motion: reduce) { .meter div { transition: none; } }
</style>
