'use client'

import type { AppError } from '@/lib/errors/AppError'
import Button from '@/components/ui/Button'
import { AlertTriangleIcon } from '@/components/ui/icons'

type Props = {
  error: AppError
  onRetry?: () => void
  className?: string
}

/**
 * نمایش خطای یک query در همان ویویی که داده را مصرف می‌کند.
 *
 * دکمه‌ی تلاش مجدد فقط برای خطاهای گذرا نمایش داده می‌شود؛ تکرار یک
 * خطای اعتبارسنجی یا دسترسی نتیجه‌ای ندارد و فقط کاربر را در حلقه
 * می‌اندازد. پیام خطا از `error.userMessage` می‌آید، نه از خود Error.
 */
export default function ErrorState({ error, onRetry, className = '' }: Props) {
  return (
    <div
      role="alert"
      className={`flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center ${className}`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangleIcon size={22} />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-text">خطایی رخ داد</p>
        <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-text-2">
          {error.userMessage}
        </p>
      </div>
      {error.retryable && onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          تلاش مجدد
        </Button>
      )}
    </div>
  )
}
