import type { AppError } from './AppError'
import { buildMonitorEvent, emitErrorEvent, type MonitorSeverity } from './monitoring'

/**
 * لاگ ساختارمند خطا.
 *
 * سیاست اصلی که از قبل وجود داشت و **حفظ شده**:
 *  - production فقط `code`، `field`، `operation` و `status` لاگ می‌شود؛
 *    متن خام می‌تواند جزئیات دیتابیس یا داده‌ی حساس داشته باشد.
 *  - development متن کامل به‌همراه `cause` چاپ می‌شود تا دیباگ ممکن باشد.
 *
 * چیزی که اضافه شده: یک **نقطه‌ی اتصال** برای Error Monitoring در
 * production. خودِ این سرویس هنوز نصب نشده (طبق محدودیت این مرحله)،
 * ولی رویداد از همین نقطه ساخته و به monitorهای ثبت‌شده تحویل داده
 * می‌شود. برای افزودن Sentry کافی است یک `registerErrorMonitor` صدا زده
 * شود؛ نیازی به دست‌زدن به هیچ فایل دیگری نیست.
 *
 * داده‌ای که از این مسیر بیرون می‌رود همیشه از `sanitizeForMonitoring`
 * رد می‌شود، پس حتی وقتی سرویس اضافه شد، رمز/توکن/JWT/ایمیل به آن
 * نمی‌رسد. جزئیات در `monitoring.ts` و `sanitize.ts`.
 *
 * @param operation نام عملیاتی که خطا در آن رخ داده، مثل 'card.create'
 * @param severity  برای وضعیت‌های گذرا `warning` بده (مثل قطع‌ووصل موقت
 *   realtime). پیش‌فرض `error` است. چاپِ console در هر دو حالت یکسان
 *   می‌ماند؛ این فقط دسته‌بندیِ رویداد برای سرویس monitoring است.
 */
export function logError(
  error: AppError,
  operation?: string,
  options: { severity?: MonitorSeverity } = {}
): void {
  const { severity = 'error' } = options

  if (process.env.NODE_ENV === 'production') {
    console.error('[kanban]', {
      code: error.code,
      operation,
      field: error.field,
      status: error.status,
    })
  } else {
    console.error('[kanban]', {
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      operation,
      field: error.field,
      status: error.status,
      retryable: error.retryable,
      cause: error.cause,
    })
  }

  // هویت کاربر عمداً پیوست نمی‌شود. اپ client-side است و هر چیزی که
  // به این نقطه برسد، قبلش از `sanitizeForMonitoring` رد شده؛ افزودن شناسه
  // یا نشست کاربر برای گروه‌بندی خطا، داده‌ی شخصی تازه‌ای وارد جریان
  // می‌کرد که سودش به سختی ارزشش را توجیه می‌کرد.
  emitErrorEvent(buildMonitorEvent(error, operation, { severity }))
}
