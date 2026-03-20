import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabase'
import type { User } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isInitialized = ref(false)

  async function initialize() {
    const { data: { session } } = await supabase.auth.getSession()
    user.value = session?.user || null
    isInitialized.value = true

    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user || null
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
  }

  return {
    user,
    isInitialized,
    initialize,
    signOut
  }
})
