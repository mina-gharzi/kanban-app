import { isRetryableCode, type ErrorCode } from './errorCodes'
import { getUserErrorMessage } from './errorMessages'

export type AppErrorOptions = {
  /** دسته‌ی خطا از مجموعه‌ی استاندارد ERROR_CODES. */
  code: ErrorCode
  /** پیام فنی برای لاگ و دیباگ؛ هرگز به کاربر نمایش داده نمی‌شود. */
  message: string
  /** پیام فارسی؛ اگر داده نشود از mapping کد گرفته می‌شود. */
  userMessage?: string
  /** کد HTTP در صورت وجود (مثل ۴۰۱ یا ۴۲۵ برای RLS). */
  status?: number
  /** خطای اصلی زیربنایی، برای زنجیره‌ی علت. */
  cause?: unknown
  /** نام فیلد مرتبط، برای نمایش خطای اعتبارسنجی کنار همان فیلد. */
  field?: string
  /** بازنویسی پیش‌فرض «قابل تلاش مجدد بودن» که از کد مشتق می‌شود. */
  retryable?: boolean
}

/**
 * تنها شکل خطایی که در لایه‌ی UI مصرف می‌شود.
 * خطای خام Supabase یا fetch هرگز به کامپوننت نمی‌رسد؛
 * اول در normalizeError به این کلاس تبدیل می‌شود.
 */
export class AppError extends Error {
  readonly code: ErrorCode
  readonly userMessage: string
  readonly status?: number
  readonly field?: string
  readonly retryable: boolean

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause })
    this.name = 'AppError'
    this.code = options.code
    this.userMessage = options.userMessage ?? getUserErrorMessage(options.code)
    this.status = options.status
    this.field = options.field
    this.retryable = options.retryable ?? isRetryableCode(options.code)
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
