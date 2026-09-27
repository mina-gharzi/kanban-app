import type { AppError } from './AppError'
import { ERROR_CODES } from './errorCodes'
import { logError } from './logError'
import { normalizeError } from './normalizeError'
import { handleSessionExpired, isAuthPage } from '@/lib/supabase/auth'
import { useToastStore } from '@/store/toastStore'

/**
 * تنها جایی که خطای یک عملیات (mutation) به کاربر نشان داده می‌شود.
 * Componentها فقط UI هستند و نباید خودشان toast خطا بسازند.
 *
 * مالکیت خطا در کل پروژه:
 *  - Validation   → فرم، کنار فیلد مربوطه
 *  - Mutation     → همین تابع (rollback در هوک + toast اینجا)
 *  - Authentication → لایه‌ی auth (پاک کردن نشست + ریدایرکت، بدون toast تکراری)
 *  - Query        → خود ویو به‌صورت inline (بدون toast)
 *  - Crash        → app/error.tsx
 *
 * @param operation نام عملیات برای لاگ، مثل 'card.create'
 */
export function reportError(error: unknown, operation?: string): AppError {
  const appError = normalizeError(error)
  logError(appError, operation)

  // انقضای نشست فقط یک رفتار دارد: پاک‌سازی + ریدایرکت، بدون toast تکراری
  if (appError.code === ERROR_CODES.AUTHENTICATION && !isAuthPage()) {
    void handleSessionExpired()
    return appError
  }

  useToastStore.getState().addToast(appError.userMessage, 'error')
  return appError
}
