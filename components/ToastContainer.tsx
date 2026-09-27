'use client'

import { useToastStore, type Toast } from '@/store/toastStore'
import { AlertCircleIcon, CheckCircleIcon, XIcon } from './ui/icons'

const TONE = {
  error: { icon: AlertCircleIcon, iconClass: 'text-danger' },
  success: { icon: CheckCircleIcon, iconClass: 'text-success' },
} as const

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((state) => state.removeToast)
  const tone = TONE[toast.type]
  const Icon = tone.icon

  return (
    // `alert` خودش assertive است و `status` polite؛ بنابراین اعلان‌ها
    // بدون نیاز به live-region تودرتو خوانده می‌شوند.
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border border-border bg-surface py-2.5 px-3.5 shadow-md animate-[toast-in_180ms_var(--ease-out-soft)]"
    >
      <Icon size={17} className={`mt-px shrink-0 ${tone.iconClass}`} />
      <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-text">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        aria-label="بستن اعلان"
        className="-me-1 shrink-0 rounded-sm p-1 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
      >
        <XIcon size={14} />
      </button>
    </div>
  )
}

/**
 * Toast فقط برای اتفاقات مهم (نتیجه‌ی یک mutation یا خطای آن) — نه برای
 * هر تعامل. قبلاً هیچ `role`ای نداشت و screen readerها اصلاً خطاها را
 * اعلام نمی‌کردند.
 */
export default function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts)
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-4 sm:inset-x-auto sm:items-end sm:px-0 sm:pe-4">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}

      <style>{`@keyframes toast-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  )
}
