import { reactive } from 'vue'

export type ToastType = 'default' | 'success' | 'error'

export interface ToastItem {
  id: number
  message: string
  type: ToastType
}

let nextId = 1
export const toastState = reactive<{ items: ToastItem[] }>({ items: [] })

export function showToast(message: string, type: ToastType = 'default', duration = 2200) {
  const id = nextId++
  toastState.items.push({ id, message, type })
  setTimeout(() => {
    const idx = toastState.items.findIndex(t => t.id === id)
    if (idx !== -1) toastState.items.splice(idx, 1)
  }, duration)
}
