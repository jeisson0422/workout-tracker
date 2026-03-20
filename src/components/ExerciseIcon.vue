<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  type: string
}>()

const iconHtml = computed(() => {
  const n = (props.name || '').toLowerCase()
  const exType = props.type

  if (exType === 'cardio') return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`
  if (exType === 'isometric') return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`
  if (n.includes('bench') || n.includes('press') || n.includes('flye') || n.includes('dip')) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 12h12M8 8l-4 4 4 4M16 8l4 4-4 4"/></svg>`
  if (n.includes('row') || n.includes('pulldown') || n.includes('pull') || n.includes('lat')) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 12H6M10 8l-4 4 4 4"/></svg>`
  if (n.includes('shoulder') || n.includes('military') || n.includes('lateral') || n.includes('raise') || n.includes('face_pull')) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="5" r="2"/><path d="M12 7v5m-4 5h8M8 17l-2 4M16 17l2 4"/></svg>`
  if (n.includes('bicep') || n.includes('curl') || n.includes('tricep') || n.includes('pushdown')) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 17c0-4 2-7 5-8s5 0 5 3-2 5-5 5H7"/><path d="M7 17l-1 3"/></svg>`
  if (n.includes('squat') || n.includes('leg') || n.includes('lunge') || (n.includes('curl') && n.includes('leg'))) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="4" r="2"/><path d="M12 6v6l-3 5M12 12l3 5M9 21h6"/></svg>`
  if (n.includes('hip') || n.includes('glute') || n.includes('abduction') || n.includes('rdl') || n.includes('romanian') || n.includes('deadlift')) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 17c0-4 3-7 7-7s7 3 7 7"/><path d="M5 17l-1 3M19 17l1 3"/></svg>`
  if (n.includes('plank') || n.includes('ab') || n.includes('core') || n.includes('wheel')) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="10" width="18" height="4" rx="2"/><path d="M7 10V7M17 10V7M7 14v3M17 14v3"/></svg>`
  if (n.includes('burpee') || n.includes('jump') || n.includes('sprint')) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`
  
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="6" y1="19" x2="18" y2="19"/></svg>`
})
</script>

<template>
  <div v-html="iconHtml" class="text-[var(--text2)]"></div>
</template>
