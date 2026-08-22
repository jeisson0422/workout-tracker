<script setup lang="ts">
import { HomeIcon, CalendarIcon, LayoutListIcon, BarChart2Icon, SettingsIcon } from 'lucide-vue-next'
import { haptic } from '../services/haptics'
</script>

<template>
  <nav class="nav ios-glass" @click="haptic('light')">
    <router-link to="/" class="nav-btn" active-class="active">
      <HomeIcon /> <span>Inicio</span>
    </router-link>
    <router-link to="/workout" class="nav-btn" active-class="active">
      <LayoutListIcon /> <span>Semana</span>
    </router-link>
    <router-link to="/today" class="nav-btn nav-btn-primary" active-class="active">
      <span class="today-badge"><CalendarIcon /></span>
      <span>Hoy</span>
    </router-link>
    <router-link to="/stats" class="nav-btn" active-class="active">
      <BarChart2Icon /> <span>Stats</span>
    </router-link>
    <router-link to="/config" class="nav-btn" active-class="active">
      <SettingsIcon /> <span>Config</span>
    </router-link>
  </nav>
</template>

<style scoped>
.nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-width: 430px;
  margin: 0 auto;
  border-top: 0.5px solid var(--border);
  display: flex;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
.nav-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0 6px;
  gap: 2px;
  border: none;
  background: transparent;
  color: var(--text3);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: -.1px;
  cursor: pointer;
  transition: color .15s, transform .15s;
  text-decoration: none;
}
.nav-btn:active {
  transform: scale(0.92);
}
.nav-btn-primary:active {
  transform: none;
}
.nav-btn.active {
  color: var(--accent2);
}
.nav-btn :deep(svg) {
  width: 24px;
  height: 24px;
  transition: transform .15s;
}
.nav-btn.active :deep(svg) {
  transform: translateY(-1px) scale(1.05);
}

/* "Hoy" — botón principal, elevado, con más peso visual */
.nav-btn-primary {
  padding-top: 0;
  font-weight: 700;
  color: var(--accent2);
}
.today-badge {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -20px;
  margin-bottom: 2px;
  background: linear-gradient(145deg, var(--accent), var(--accent2));
  box-shadow: 0 6px 16px rgba(108,99,255,.45), 0 0 0 4px var(--glass-bg);
  transition: transform .15s, box-shadow .15s;
}
.today-badge :deep(svg) {
  width: 24px;
  height: 24px;
  color: #fff;
  transition: none;
}
.nav-btn-primary.active .today-badge {
  box-shadow: 0 6px 20px rgba(108,99,255,.6), 0 0 0 4px var(--glass-bg);
}
.nav-btn-primary:active .today-badge {
  transform: scale(0.9);
}
</style>
