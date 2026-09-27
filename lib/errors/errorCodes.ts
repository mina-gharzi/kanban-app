/**
 * کدهای استاندارد خطا — تنها منبع حقیقت برای دسته‌بندی خطا در کل پروژه.
 * هیچ‌جا نباید رشته‌ی خام برای مقایسه‌ی کد خطا استفاده شود.
 */
export const ERROR_CODES = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  NETWORK: 'NETWORK_ERROR',
  DATABASE: 'DATABASE_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  UNKNOWN: 'UNKNOWN_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

/**
 * فقط خطاهای گذرا تلاش مجدد می‌گیرند.
 * Validation / Authentication / Authorization / NotFound / Conflict
 * با تکرار درخواست نتیجه‌ی متفاوتی نمی‌دهند.
 */
const RETRYABLE_CODES: ReadonlySet<ErrorCode> = new Set([
  ERROR_CODES.NETWORK,
  ERROR_CODES.DATABASE,
  ERROR_CODES.RATE_LIMIT,
])

export function isRetryableCode(code: ErrorCode): boolean {
  return RETRYABLE_CODES.has(code)
}
