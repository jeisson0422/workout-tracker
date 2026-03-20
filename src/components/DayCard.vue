<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkoutStore } from '../stores/workout'
import { ChevronRightIcon } from 'lucide-vue-next'
import ExerciseRow from './ExerciseRow.vue'

const props = defineProps<{
  dayIndex: number
  dayLabel: string
  exercises: any[]
  isDone: boolean
  startOpen?: boolean
}>()

const emit = defineEmits(['open-modal'])

const store = useWorkoutStore()

const isOpen = ref(props.startOpen || false)

const groupedExercises = computed(() => {
  const result: any[] = []
  let lastGroup: string | number | null = null

  props.exercises.forEach((ex, index) => {
    const grp = ex.group_id || null
    if (grp && grp !== lastGroup) {
      result.push({ isHeader: true, id: grp, type: ex.group_type || 'superset' })
    }
    lastGroup = grp
    result.push({ isHeader: false, data: ex, index })
  })

  return result
})

function getGroupLabel(type: string) {
  const labels: Record<string, string> = { superset: 'superset', triset: 'triset', giant_set: 'giant set', pyramid: 'pirámide', drop_set: 'drop set', finisher: 'finisher' }
  return labels[type] || type
}
</script>

<template>
  <div class="day-card" :class="{ open: isOpen }">
    <div v-if="!startOpen" class="day-header" @click="isOpen = !isOpen">
      <div class="day-num" :style="isDone ? 'background:var(--green)' : ''">D{{ dayIndex + 1 }}</div>
      <div class="day-info">
        <div class="day-name">{{ dayLabel }}</div>
        <div class="day-count">{{ isDone ? '✓ completado' : exercises.length + ' ejercicios' }}</div>
      </div>
      <ChevronRightIcon class="day-chevron" />
    </div>

    <div class="ex-list" v-show="isOpen">
      <template v-for="(item, i) in groupedExercises" :key="i">
        <div v-if="item.isHeader" class="group-header">
          {{ getGroupLabel(item.type) }} {{ item.id }}
        </div>
        <ExerciseRow 
          v-else
          :exercise="item.data"
          :day-label="dayLabel"
          :day-index="dayIndex"
          :ex-index="item.index"
          :is-logged="store.loggedThisSession.has(`${dayIndex}-${item.index}`)"
          @open-modal="emit('open-modal', $event)"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.day-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r); margin: 0 16px 10px; overflow: hidden; }
.day-header { display: flex; align-items: center; padding: 14px 16px; gap: 10px; cursor: pointer; user-select: none; }
.day-num { width: 32px; height: 32px; border-radius: 8px; background: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; }
.day-info { flex: 1; }
.day-name { font-size: 15px; font-weight: 600; }
.day-count { font-size: 12px; color: var(--text2); margin-top: 1px; }
.day-chevron { color: var(--text2); transition: transform .2s; flex-shrink: 0; width: 18px; height: 18px; }
.day-card.open .day-chevron { transform: rotate(90deg); }
.ex-list { border-top: 1px solid var(--border); }
.group-header { font-size: 10px; font-weight: 700; color: var(--accent2); text-transform: uppercase; letter-spacing: .5px; padding: 8px 16px 0; opacity: .7; }
</style>
