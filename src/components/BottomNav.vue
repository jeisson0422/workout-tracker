<script setup lang="ts">
import { HomeIcon, CalendarIcon, LayoutListIcon, BarChart2Icon, SettingsIcon } from 'lucide-vue-next'
</script>

<template>
  <nav class="nav">
    <router-link to="/" class="nav-btn" active-class="active">
      <HomeIcon /> Inicio
    </router-link>
    <router-link to="/today" class="nav-btn" active-class="active">
      <CalendarIcon /> Hoy
    </router-link>
    <router-link to="/workout" class="nav-btn" active-class="active">
      <LayoutListIcon /> Semana
    </router-link>
    <router-link to="/stats" class="nav-btn" active-class="active">
      <BarChart2Icon /> Stats
    </router-link>
    <router-link to="/config" class="nav-btn" active-class="active">
      <SettingsIcon /> Config
    </router-link>
  </nav>
</template>

<style scoped>
.nav {
  position: sticky;
  bottom: 0;
  background: var(--bg2);
  border-top: 1px solid var(--border);
  display: flex;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
.nav-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 0 8px;
  gap: 4px;
  border: none;
  background: transparent;
  color: var(--text2);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
  text-decoration: none;
}
.nav-btn.active {
  color: var(--accent2);
}
.nav-btn :deep(svg) {
  width: 26px;
  height: 26px;
}
</style>
