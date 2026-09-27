import { AppError, isAppError } from './AppError'
import { ERROR_CODES, type ErrorCode } from './errorCodes'
import { getAuthError } from './errorMessages'

/**
 * شکل مشترک خطاهای Supabase: هم PostgrestError و هم AuthError
 * فیلدهای message/code/status را دارند.
 */
type RawSupabaseError = {
  message: string
  code?: string
  status?: number
}

const NETWORK_PATTERN =
  /fetch failed|failed to fetch|networkerror|network request failed|load failed|timeout|timed out|econnrefused|econnreset|enotfound|connection (refused|closed|failed|reset)/i
const PERMISSION_PATTERN =
  /permission denied|row-level security|not authorized|insufficient privilege/i
const CONFLICT_PATTERN =
  /duplicate key|unique constraint|already exists|violates (foreign key|unique)/i
const TOKEN_PATTERN = /jwt|token has expired|invalid claim|session (expired|missing|not found)/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asSupabaseError(error: unknown): RawSupabaseError | null {
  if (!isRecord(error) || typeof error.message !== 'string') return null
  return {
    message: error.message,
    code: typeof error.code === 'string' ? error.code : undefined,
    status: typeof error.status === 'number' ? error.status : undefined,
  }
}

/** توصیف امنِ مقداری که Error نیست، بدون صدا زدن toString دلخواه. */
function describe(value: unknown): string {
  if (typeof value === 'string') return value
  if (isRecord(value)) return Object.prototype.toString.call(value)
  return String(value)
}

function fromStatus(status: number): ErrorCode | undefined {
  if (status === 401) return ERROR_CODES.AUTHENTICATION
  if (status === 403) return ERROR_CODES.AUTHORIZATION
  if (status === 404) return ERROR_CODES.NOT_FOUND
  if (status === 409) return ERROR_CODES.CONFLICT
  if (status === 429) return ERROR_CODES.RATE_LIMIT
  if (status >= 500) return ERROR_CODES.DATABASE
  return undefined
}

/** کدهای خطای Postgres/PostgREST به دسته‌ی برنامه نگاشت می‌شوند. */
function fromPostgresCode(code: string): ErrorCode | undefined {
  if (code === '42501') return ERROR_CODES.AUTHORIZATION
  if (code === 'PGRST116') return ERROR_CODES.NOT_FOUND
  if (code.startsWith('23')) return ERROR_CODES.CONFLICT
  if (code.startsWith('08')) return ERROR_CODES.NETWORK
  if (code.startsWith('22') || code.startsWith('42')) return ERROR_CODES.DATABASE
  return undefined
}

/**
 * تنها دروازه‌ی خطا: هر چیزی که از لایه‌ی پایین می‌آید (Supabase، fetch،
 * Error معمولی، یا مقدار ناشناخته) به AppError تبدیل می‌شود تا
 * لایه‌ی UI فقط با یک شکل تایپ‌شده کار کند.
 * اگر خطا از قبل AppError باشد بدون تغییر برگردانده می‌شود.
 */
export function normalizeError(error: unknown): AppError {
  if (isAppError(error)) return error

  if (typeof error === 'string') {
    return new AppError({ code: ERROR_CODES.UNKNOWN, message: error, cause: error })
  }

  const raw = asSupabaseError(error)

  if (!raw) {
    return new AppError({
      code: ERROR_CODES.UNKNOWN,
      message: error instanceof Error ? error.message : describe(error),
      cause: error,
    })
  }

  const cause = error

  // ۱) کدهای شناخته‌شده‌ی Auth: دقیق‌ترین دسته‌بندی را دارند
  const authError = getAuthError(raw.code ?? '')
  if (authError) {
    return new AppError({
      code: authError.code,
      message: raw.message,
      userMessage: authError.userMessage,
      status: raw.status,
      cause,
    })
  }

  // ۲) کد وضعیت HTTP
  const statusCode = raw.status ? fromStatus(raw.status) : undefined
  if (statusCode) {
    return new AppError({
      code: statusCode,
      message: raw.message,
      status: raw.status,
      cause,
    })
  }

  // ۳) کد خطای دیتابیس
  if (raw.code) {
    const postgresCode = fromPostgresCode(raw.code)
    if (postgresCode) {
      return new AppError({
        code: postgresCode,
        message: `${raw.code}: ${raw.message}`,
        cause,
      })
    }
  }

  // ۴) تشخیص از روی متن، وقتی کدی در دسترس نیست
  if (NETWORK_PATTERN.test(raw.message)) {
    return new AppError({
      code: ERROR_CODES.NETWORK,
      message: raw.message,
      cause,
    })
  }
  if (TOKEN_PATTERN.test(raw.message)) {
    return new AppError({
      code: ERROR_CODES.AUTHENTICATION,
      message: raw.message,
      cause,
    })
  }
  if (PERMISSION_PATTERN.test(raw.message)) {
    return new AppError({
      code: ERROR_CODES.AUTHORIZATION,
      message: raw.message,
      cause,
    })
  }
  if (CONFLICT_PATTERN.test(raw.message)) {
    return new AppError({
      code: ERROR_CODES.CONFLICT,
      message: raw.message,
      cause,
    })
  }

  // ۵) خطای دیتابیس ناشناخته در برابر خطای ناشناخته‌ی برنامه
  if (raw.code) {
    return new AppError({
      code: ERROR_CODES.DATABASE,
      message: `${raw.code}: ${raw.message}`,
      cause,
    })
  }

  return new AppError({ code: ERROR_CODES.UNKNOWN, message: raw.message, cause })
}
