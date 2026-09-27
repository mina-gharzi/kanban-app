'use client'

import { useEffect } from 'react'
import { logError } from '@/lib/errors/logError'
import { normalizeError } from '@/lib/errors/normalizeError'

/**
 * مرز خطای سراسری برای crash غیرمنتظره‌ی UI.
 * خطاهای query/mutation از مسیر خودشان (inline و toast) مدیریت
 * می‌شوند و نباید به اینجا برسند.
 */
export default function AppErrorFallback({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    logError(normalizeError(error), 'app.render')
  }, [error])

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="text-column text-sm">مشکلی پیش آمده است.</h1>
      <p className="text-column/60 text-xs max-w-xs">
        لطفاً صفحه را دوباره بارگذاری کنید.
      </p>
      <button
        onClick={() => retry()}
        className="bg-accent text-surface text-xs rounded-md px-4 py-2"
      >
        بارگذاری مجدد
      </button>
    </div>
  )
}
