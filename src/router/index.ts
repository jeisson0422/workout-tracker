import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { 
      path: '/login', 
      component: () => import('../views/Login.vue'),
      meta: { requiresAuth: false, hideNav: true }
    },
    { 
      path: '/', 
      component: () => import('../views/Home.vue'),
      meta: { requiresAuth: true }
    },
    { 
      path: '/today', 
      component: () => import('../views/Today.vue'),
      meta: { requiresAuth: true }
    },
    { 
      path: '/workout', 
      component: () => import('../views/Workout.vue'),
      meta: { requiresAuth: true }
    },
    { 
      path: '/stats', 
      component: () => import('../views/Stats.vue'),
      meta: { requiresAuth: true }
    },
    { 
      path: '/config', 
      component: () => import('../views/Config.vue'),
      meta: { requiresAuth: true }
    },
  ]
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  
  // Wait until auth is initialized
  if (!authStore.isInitialized) {
    // If not initialized, it shouldn't happen if we await it in App.vue before mounting router
    // but just in case
  }

  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !authStore.user) {
    next('/login')
  } else if (to.path === '/login' && authStore.user) {
    next('/')
  } else {
    next()
  }
})

export default router
