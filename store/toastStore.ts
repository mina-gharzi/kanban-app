import { create } from 'zustand'

export type Toast = {
  id: string
  message: string
  type: 'error' | 'success'
}

type ToastState = {
  toasts: Toast[]
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'error') => {
    const id = crypto.randomUUID()
    set((state) => {
      // یک خطای تکراری نباید چند toast روی هم بسازد
      const isDuplicate = state.toasts.some(
        (toast) => toast.message === message && toast.type === type
      )
      if (isDuplicate) return state
      return { toasts: [...state.toasts, { id, message, type }] }
    })
    // خودکار بعد از ۴ ثانیه پاک می‌شه
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
