'use client'

import { useEffect } from 'react'
import { logError } from '@/lib/errors/logError'
import { normalizeError } from '@/lib/errors/normalizeError'
import Button from '@/components/ui/Button'
import { AlertTriangleIcon } from '@/components/ui/icons'

/**
 * مرز خطای سراسری برای crash غیرمنتظره‌ی UI.
 * خطاهای query/mutation از مسیر خودشان (inline و toast) مدیریت
 * می‌شوند و نباید به اینجا برسند.
 */
export default function AppErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logError(normalizeError(error), 'app.render')
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangleIcon size={22} />
      </span>
      <div className="space-y-1">
        <h1 className="text-sm font-medium text-text">مشکلی پیش آمده است</h1>
        <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-text-2">
          خطایی در نمایش این صفحه رخ داد. می‌توانید دوباره تلاش کنید؛ اگر
          تکرار شد، صفحه را تازه‌سازی کنید.
        </p>
      </div>
      <Button onClick={reset}>بارگذاری مجدد</Button>
    </div>
  )
}
