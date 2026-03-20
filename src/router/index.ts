import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('../views/Home.vue') },
    { path: '/today', component: () => import('../views/Today.vue') },
    { path: '/workout', component: () => import('../views/Workout.vue') },
    { path: '/stats', component: () => import('../views/Stats.vue') },
    { path: '/config', component: () => import('../views/Config.vue') },
  ]
})

export default router
