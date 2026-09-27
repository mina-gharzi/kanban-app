'use client'

import type { AppError } from '@/lib/errors/AppError'

type Props = {
  error: AppError
  onRetry?: () => void
}

/**
 * نمایش خطای یک query در همان ویویی که داده را مصرف می‌کند.
 * دکمه‌ی تلاش مجدد فقط برای خطاهای گذرا نمایش داده می‌شود؛
 * تکرار یک خطای اعتبارسنجی یا دسترسی نتیجه‌ای ندارد.
 */
export default function ErrorState({ error, onRetry }: Props) {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3 p-4 text-center">
      <p className="text-column text-sm max-w-xs">{error.userMessage}</p>
      {error.retryable && onRetry && (
        <button
          onClick={onRetry}
          className="bg-accent text-surface text-xs rounded-md px-4 py-2"
        >
          تلاش مجدد
        </button>
      )}
    </div>
  )
}
