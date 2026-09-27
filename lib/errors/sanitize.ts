/**
 * پاک‌سازی داده قبل از ارسال به سرویس Error Monitoring.
 *
 * این ماژول عمداً **pure** است: هیچ سرویسی نمی‌شناسد و فقط یک تابع
 * می‌دهد. دلیلش امنیت است — اگر منطق حذف داده‌ی حساس کنارِ SDK سرویس
 * بنشیند، هر بار که SDK عوض شود ممکن است همراهش پاک شود یا دور زده شود.
 * اینجا جدا می‌ماند و برای خودش تست می‌شود.
 *
 * سیاست: سیاهه‌ی سفید نیست. هر کلیدی که شبیه یک راز باشد حذف می‌شود،
 * حتی اگر اسمش را نشناخته باشیم. برای داده‌ی تشخیصی، کلیدهای صریح
 * (`code`, `status`, `operation`, `field`) هرگز به‌عنوان راز تلقی
 * نمی‌شوند — وگرنه کل سیگنال تشخیصی از بین می‌رود.
 *
 * سه لایه‌ی دفاعی، به این ترتیب ارزش:
 *   ۱) کلیدهای حساس  → نام کلید (password / token / authorization / …)
 *   ۲) الگوهای مقدار → JWT، هدر `Bearer`، ایمیل
 *   ۳) محدودیت اندازه → جلوی نشت یک داده‌ی خیلی بزرگ را می‌گیرد
 */

/** کلیدهایی که مقدارشان هرگز نباید از پروسه خارج شود. */
const SENSITIVE_KEY_PATTERNS: readonly RegExp[] = [
  /pass(word|wd|phrase)?$/i,
  /^(pass|pin)$/i,
  /token$/i,
  /^auth(orization)?$/i,
  /^jwt$/i,
  /bearer$/i,
  /secret/i,
  /api[-_]?key/i,
  /credential/i,
  /private[-_]?key/i,
  /session/i,
  /cookie/i,
  /^otp$/i,
  /^(sms|email)[-_]?code$/i,
  /refresh/i,
  /^salt$/i,
  /x-supabase/i,
]

/** JWT (سه بخش base64url که با `eyJ` شروع می‌شود). */
const JWT = /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g

/** هدر Authorization به شکل `Bearer <token>`. */
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi

/** ایمیل؛ رایج‌ترین داده‌ی شخصی در خطاهای احراز هویت. */
const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g

/** رشته‌هایی که نباید لو بروند، حتی اگر کلیدشان بی‌خطر به نظر برسد. */
const VALUE_PATTERNS: readonly RegExp[] = [JWT, BEARER, EMAIL]

export const REDACTED = '[redacted]'

export type SanitizeOptions = {
  /** عمق بیشتر از این، فقط خلاصه می‌شود (payloadهای تو در تو). */
  maxDepth?: number
  /** طول بیشتر از این، بریده می‌شود. */
  maxStringLength?: number
  /** تعداد عضو آرایه/کلید بیشتر از این، حذف می‌شود. */
  maxItems?: number
  /** چند کلید از هر object نگه داشته شود. */
  maxKeys?: number
}

const DEFAULTS = {
  maxDepth: 6,
  maxStringLength: 512,
  maxItems: 40,
  maxKeys: 40,
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))
}

/** حذف الگوهای حساس از داخل یک رشته. */
export function sanitizeString(value: string, maxLength: number): string {
  let output = value
  for (const pattern of VALUE_PATTERNS) output = output.replace(pattern, REDACTED)
  return output.length > maxLength ? output.slice(0, maxLength) + '…[truncated]' : output
}

/**
 * نسخه‌ی امنِ هر مقدار، آماده‌ی ارسال.
 *
 * چند دفاعی هم‌زمان انجام می‌شود: کلید حساس، چرخه‌های مرجع، عمق زیاد،
 * مقادیر غیرقابل‌سریال‌سازی و اندازه‌ی بیش از حد. تابع هیچ‌وقت throw
 * نمی‌کند؛ یک لایه‌ی لاگ نباید خودش باعث crash شود.
 */
export function sanitizeForMonitoring(
  value: unknown,
  options: SanitizeOptions = {},
  seen: WeakSet<object> = new WeakSet(),
  depth = 0
): unknown {
  const { maxDepth, maxStringLength, maxItems, maxKeys } = { ...DEFAULTS, ...options }

  if (value === null || value === undefined) return value ?? null

  if (typeof value === 'string') return sanitizeString(value, maxStringLength)

  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value)
  if (typeof value === 'boolean') return value

  // function و symbol و bigint هیچ سیگنال تشخیصی ندارند
  if (typeof value === 'function') return '[function]'
  if (typeof value === 'symbol') return value.toString()
  if (typeof value === 'bigint') return value.toString()

  if (value instanceof Date) return value.toISOString()
  if (value instanceof RegExp) return value.toString()

  if (depth >= maxDepth) return '[max depth]'

  if (seen.has(value)) return '[circular]'
  seen.add(value)

  try {
    // این شاخه **باید** بعد از ثبت در `seen` باشد. خطا خودش یک شاخه‌ی
    // `cause` دارد و هیچ قانونی نیست که cause نکند خودش باشد؛ اگر این
    // بررسی قبل از `seen.add` می‌ماند، `err.cause = err` بازگشت بی‌نهایت
    // می‌ساخت و یک RangeError جای خطای اصلی را می‌گرفت — یعنی خودِ لاگ،
    // بدترین حالت ممکن را می‌ساخت.
    if (value instanceof Error) return sanitizeError(value, options, seen, depth)

    if (Array.isArray(value)) {
      const items = value.slice(0, maxItems).map((item) =>
        sanitizeForMonitoring(item, options, seen, depth + 1)
      )
      if (value.length > maxItems) items.push(`…${value.length - maxItems} مورد دیگر`)
      return items
    }

    const output: Record<string, unknown> = {}
    const entries = Object.entries(value as Record<string, unknown>).slice(0, maxKeys)
    for (const [key, item] of entries) {
      output[key] = isSensitiveKey(key)
        ? REDACTED
        : sanitizeForMonitoring(item, options, seen, depth + 1)
    }
    return output
  } catch {
    // getter یا Proxy که throw می‌کند نباید لاگ را از کار بیندازد
    return '[unserializable]'
  } finally {
    seen.delete(value)
  }
}

/**
 * خطاها داده‌ی مهمی دارند و معمولاً `JSON.stringify` آن‌ها را خالی
 * می‌دهد (چون `message` و `stack` غیر-enumerable هستند). پس دستی
 * برشته‌هایشان را بیرون می‌کشیم و دوباره از فیلتر رد می‌کنیم.
 */
function sanitizeError(
  error: Error,
  options: SanitizeOptions,
  seen: WeakSet<object>,
  depth: number
): Record<string, unknown> {
  const { maxStringLength } = { ...DEFAULTS, ...options }
  const output: Record<string, unknown> = {
    name: error.name,
    message: sanitizeString(String(error.message), maxStringLength),
  }

  // `cause` زنجیره‌ی علت است و ممکن است خطای دیگری باشد؛ همان فیلتر می‌خورد
  if (error.cause !== undefined && error.cause !== null) {
    output.cause = sanitizeForMonitoring(error.cause, options, seen, depth + 1)
  }

  for (const key of ['code', 'status', 'field', 'operation', 'retryable'] as const) {
    const value = (error as unknown as Record<string, unknown>)[key]
    if (value !== undefined) {
      output[key] = typeof value === 'string' ? sanitizeString(value, maxStringLength) : value
    }
  }

  // stack فقط در حالت توسعه؛ در production مسیر/ساختار فایل‌ها را افشا می‌کند
  if (process.env.NODE_ENV !== 'production' && error.stack) {
    output.stack = sanitizeString(error.stack, maxStringLength)
  }

  return output
}
