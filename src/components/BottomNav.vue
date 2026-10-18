<script setup lang="ts">
import { HomeIcon, CalendarIcon, LayoutListIcon, BarChart2Icon, SettingsIcon } from 'lucide-vue-next'
import { haptic } from '../services/haptics'
</script>

<template>
  <nav class="nav" aria-label="Principal" @click="haptic('light')">
    <router-link to="/" class="nav-btn" active-class="active" exact-active-class="active">
      <HomeIcon aria-hidden="true" /> <span>Inicio</span>
    </router-link>
    <router-link to="/workout" class="nav-btn" active-class="active">
      <LayoutListIcon aria-hidden="true" /> <span>Semana</span>
    </router-link>
    <router-link to="/today" class="nav-btn nav-btn-primary" active-class="active">
      <span class="today-badge"><CalendarIcon aria-hidden="true" /></span>
      <span>Hoy</span>
    </router-link>
    <router-link to="/stats" class="nav-btn" active-class="active">
      <BarChart2Icon aria-hidden="true" /> <span>Stats</span>
    </router-link>
    <router-link to="/config" class="nav-btn" active-class="active">
      <SettingsIcon aria-hidden="true" /> <span>Ajustes</span>
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
  background: var(--bg2);
  border-top: 1.5px solid var(--border);
  display: flex;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.nav-btn {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0 8px;
  gap: 3px;
  color: var(--text2);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: color .15s;
}
.nav-btn:active { opacity: .7; }
.nav-btn :deep(svg) { width: 22px; height: 22px; }
.nav-btn.active { color: var(--text); }
/* Marca de pestaña activa: barra de disco en el borde superior */
.nav-btn.active::before {
  content: '';
  position: absolute;
  top: -1.5px;
  left: 22%;
  right: 22%;
  height: 3px;
  background: var(--accent);
}

/* "Hoy" — la acción principal: disco amarillo elevado */
.nav-btn-primary { padding-top: 0; color: var(--text); font-weight: 700; }
.nav-btn-primary.active::before { display: none; }
.today-badge {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -18px;
  background: var(--accent);
  color: var(--accent-text);
  border: 3px solid var(--bg2);
  outline: 1.5px solid var(--border);
}
.nav-btn-primary.active .today-badge { outline-color: var(--text); }
.today-badge :deep(svg) { color: var(--accent-text); }
.nav-btn-primary:active .today-badge { transform: scale(0.94); }
</style>
