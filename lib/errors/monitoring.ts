/**
 * نقطه‌ی اتصال Error Monitoring.
 *
 * ## چرا این فایل وجود دارد؟
 *
 * پروژه در حال حاضر **هیچ سرویس monitoring ندارد** (نه Sentry، نه چیز
 * دیگری) و طبق محدودیت این مرحله نباید هم بی‌دلیل نصب شود. پس این فایل
 * سرویس اضافه نمی‌کند؛ فقط یک **مرز** می‌سازد تا افزودن سرویس بعداً
 * تغییرِ پرهزینه در کل کد نباشد.
 *
 * جریان فعلی و آینده یکسان است:
 *
 *     reportError / logError
 *            ↓
 *     buildMonitorEvent()      ← ساخت رویداد + پاک‌سازی
 *            ↓
 *     emitErrorEvent()
 *            ├── console.error        (همیشه، رفتار فعلی حفظ شده)
 *            └── monitorهای ثبت‌شده   (فعلاً هیچ‌کدام)
 *
 * برای افزودن Sentry فقط یک خط لازم است، در جایی که به اپ می‌گوید
 * اپ بالا آمده (مثلاً `app/providers.tsx` یا یک فایل `instrumentation.ts`):
 *
 *     import * as Sentry from '@sentry/nextjs'
 *     registerErrorMonitor((event) => Sentry.captureException(event.error))
 *
 * نکته‌ی مهم: همه‌چیز از `sanitizeForMonitoring` رد می‌شود، پس سرویس
 * بیرونی هم داده‌ی پاک‌سازی‌شده می‌گیرد. سرویس دوم هم نباید بتواند
 * دور بزندش.
 */

import type { AppError } from './AppError'
import { sanitizeForMonitoring, type SanitizeOptions } from './sanitize'

/** رویداد آماده‌ی ارسال به سرویس monitoring. */
export type MonitorEvent = {
  /**
   * شدت رویداد.
   *
   * تفکیک این دو مهم است: `error` یعنی یک **عملیات شکست خورد** و باید
   * روی آن alert داد. `warning` یعنی وضعیت **موقتاً خراب است ولی خودش
   * درست می‌شود** (قطع‌ووصل موقت realtime، لکن‌شدن شبکه، ...) و فقط
   * باید دیده شود. اگر این دو یکی شوند، هر بار که لپ‌تاپ از خواب بیدار
   * می‌شود یک «خطا» ثبت می‌شود و سیگنالِ خطاهای واقعی زیر آن گم می‌شود.
   */
  severity: MonitorSeverity
  /** نام عملیاتی که خطا در آن رخ داده، مثل `card.move`. */
  operation: string | null
  /** کد نرمال‌شده‌ی خطا از `ERROR_CODES`؛ برای گروه‌بندی و alert. */
  code: string
  /** پیام فنیِ پاک‌سازی‌شده. برای تشخیص، نه برای نمایش به کاربر. */
  message: string
  status?: number
  field?: string
  retryable?: boolean
  /** زمان ISO؛ سرویس معمولاً خودش هم می‌گیرد ولی صراحت بهتر است. */
  timestamp: string
  environment: string
  release?: string
  /** پیام فارسی؛ برای دیدن اینکه کاربر واقعاً چه دیده. */
  userMessage?: string
  /** زنجیره‌ی علت، پاک‌سازی‌شده. */
  cause?: unknown
  /** context اضافی؛ همیشه پاک‌سازی می‌شود. */
  context?: unknown
}

/**
 * شدت رویداد. پیش‌فرض `error` است چون هر چیزی که از مسیر
 * `reportError` رد می‌شود، از قبل یک عملیاتِ شکست‌خورده است؛ فقط
 * وضعیت‌های گذرا باید صریحاً `warning` اعلام کنند.
 */
export type MonitorSeverity = 'error' | 'warning'

/** گزینه‌های اختیاری ساخت رویداد. */
export type BuildMonitorEventOptions = {
  context?: unknown
  sanitize?: SanitizeOptions
  severity?: MonitorSeverity
}

export type ErrorMonitor = (event: MonitorEvent) => void

const monitors = new Set<ErrorMonitor>()

/**
 * ثبت یک مقصد ارسال. چند monitor می‌توانند هم‌زمان ثبت شوند.
 * تابع همیشه قبل از فراخوانی، خودش را در برابر throw محافظت می‌کند.
 */
export function registerErrorMonitor(monitor: ErrorMonitor): () => void {
  monitors.add(monitor)
  return () => {
    monitors.delete(monitor)
  }
}

/** فقط برای تست: از leakage بین تست‌ها جلوگیری می‌کند. */
export function resetErrorMonitors(): void {
  monitors.clear()
}

export function getErrorMonitorCount(): number {
  return monitors.size
}

/**
 * ساخت رویداد از روی `AppError`.
 *
 * تنها جایی که `sanitizeForMonitoring` صدا زده می‌شود، تا تضمین شود
 * هیچ مسیری نمی‌تواند داده‌ی خام را به بیرون بدهد.
 */
export function buildMonitorEvent(
  error: AppError,
  operation?: string,
  options: BuildMonitorEventOptions = {}
): MonitorEvent {
  const { context, sanitize, severity = 'error' } = options
  const safe = sanitizeForMonitoring(error, sanitize) as Record<string, unknown>
  const safeContext =
    context === undefined ? undefined : (sanitizeForMonitoring(context, sanitize) as unknown)

  const event: MonitorEvent = {
    severity,
    operation: operation ?? null,
    code: error.code,
    message: typeof safe.message === 'string' ? safe.message : error.message,
    status: error.status,
    field: error.field,
    retryable: error.retryable,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.NEXT_PUBLIC_APP_VERSION,
    userMessage: typeof safe.userMessage === 'string' ? safe.userMessage : undefined,
  }

  if (safe.cause !== undefined) event.cause = safe.cause
  if (safeContext !== undefined) event.context = safeContext

  return event
}

/**
 * تحویل رویداد به همه‌ی monitorهای ثبت‌شده.
 *
 * هر monitor در `try/catch` صدا زده می‌شود: سرویس monitoring که خراب
 * شود نباید بتواند خطای اصلی اپ را هم از بین ببرد. اولویت با حفظ
 * رفتار فعلی است، پس خطای monitor فقط در console گزارش می‌شود.
 */
export function emitErrorEvent(event: MonitorEvent): void {
  if (monitors.size === 0) return
  for (const monitor of [...monitors]) {
    try {
      monitor(event)
    } catch (monitorError) {
      console.error('[kanban] error monitor failed', monitorError)
    }
  }
}
