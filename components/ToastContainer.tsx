'use client'

import { useToastStore } from '@/store/toastStore'

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 left-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`px-4 py-2.5 rounded-lg text-sm text-surface shadow-lg cursor-pointer max-w-xs ${
            toast.type === 'error' ? 'bg-accent' : 'bg-column'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}