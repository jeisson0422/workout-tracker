<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '../services/supabase'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const isLogin = ref(true)
const isLoading = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  if (!email.value || !password.value) {
    errorMessage.value = 'Por favor, completa todos los campos'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    if (isLogin.value) {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
      })
      if (error) throw error
    } else {
      const { error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
      })
      if (error) throw error
      // Si se requiere confirmación por email, podrías mostrar un mensaje aquí
      // Por ahora asumiremos login automático si está configurado así en Supabase
    }
    
    // Auth state observer en App.vue o auth store redirigirá si es exitoso
    // Pero podemos forzarlo aquí por si acaso
    if (authStore.user) {
      router.push('/')
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Ocurrió un error'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="header-area">
      <div class="brand">Workout Tracker</div>
      <div class="subtitle">{{ isLogin ? 'Inicia sesión para continuar' : 'Crea una cuenta para empezar' }}</div>
    </div>

    <form @submit.prevent="handleSubmit" class="login-form">
      <div v-if="errorMessage" class="error-msg">
        {{ errorMessage }}
      </div>

      <div class="input-group">
        <label>Correo Electrónico</label>
        <input 
          type="email" 
          v-model="email" 
          placeholder="tu@email.com"
          :disabled="isLoading"
        />
      </div>

      <div class="input-group">
        <label>Contraseña</label>
        <input 
          type="password" 
          v-model="password" 
          placeholder="••••••••"
          :disabled="isLoading"
        />
      </div>

      <button type="submit" class="btn btn-primary mt-4" :disabled="isLoading">
        <span v-if="isLoading">Cargando...</span>
        <span v-else>{{ isLogin ? 'Iniciar Sesión' : 'Crear Cuenta' }}</span>
      </button>

      <div class="toggle-mode">
        <span @click="isLogin = !isLogin; errorMessage = ''">
          {{ isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión' }}
        </span>
      </div>
    </form>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 40px 20px;
  justify-content: center;
}

.header-area {
  text-align: center;
  margin-bottom: 40px;
}

.brand {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -1px;
  color: var(--accent, #6c63ff);
}

.subtitle {
  font-size: 14px;
  color: var(--text2, #9898b8);
  margin-top: 8px;
}

.login-form {
  background: var(--bg2, #12121a);
  padding: 24px;
  border-radius: var(--r, 14px);
  border: 1px solid var(--border, #2a2a44);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.input-group label {
  font-size: 12px;
  color: var(--text2, #9898b8);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

input {
  background: var(--bg3, #1a1a26);
  border: 1px solid var(--border, #2a2a44);
  border-radius: 8px;
  color: var(--text, #f0f0ff);
  font-size: 16px;
  padding: 12px 16px;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: var(--accent, #6c63ff);
}

input:disabled {
  opacity: 0.5;
}

.btn {
  display: block;
  width: 100%;
  padding: 14px;
  border-radius: 10px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all .2s;
  text-align: center;
}

.btn-primary {
  background: var(--accent, #6c63ff);
  color: var(--accent-text, #ffffff);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.mt-4 {
  margin-top: 16px;
}

.toggle-mode {
  margin-top: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text2, #9898b8);
}

.toggle-mode span {
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.error-msg {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: var(--red, #f87171);
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
  text-align: center;
}
</style>
