import { ERROR_CODES, type ErrorCode } from './errorCodes'

/**
 * تمام پیام‌های قابل نمایش به کاربر در این فایل جمع شده‌اند تا
 * یک Error Code همیشه یک پیام یکسان داشته باشد.
 */
const MESSAGES_BY_CODE: Record<ErrorCode, string> = {
  [ERROR_CODES.VALIDATION]: 'اطلاعات واردشده معتبر نیست.',
  [ERROR_CODES.AUTHENTICATION]: 'نشست شما منقضی شده است. دوباره وارد شوید.',
  [ERROR_CODES.AUTHORIZATION]: 'شما اجازه انجام این عملیات را ندارید.',
  [ERROR_CODES.NOT_FOUND]: 'موردی که به دنبال آن بودید پیدا نشد.',
  [ERROR_CODES.CONFLICT]: 'این مورد قبلاً ایجاد شده است.',
  [ERROR_CODES.NETWORK]:
    'ارتباط با سرور برقرار نشد. اتصال اینترنت خود را بررسی کنید.',
  [ERROR_CODES.DATABASE]:
    'خطایی در ذخیره‌سازی داده‌ها رخ داد. لطفاً دوباره تلاش کنید.',
  [ERROR_CODES.RATE_LIMIT]: 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.',
  [ERROR_CODES.UNKNOWN]: 'خطایی رخ داد.',
}

export function getUserErrorMessage(code: ErrorCode): string {
  return MESSAGES_BY_CODE[code]
}

/**
 * پیام دقیق‌تر برای خطاهای شناخته‌شده‌ی Supabase Auth.
 * کلیدها کد خام سرویس و مقادیر، دسته‌بندی + پیام فارسی است؛
 * به این ترتیب پیام‌های auth هم از همین فایل می‌آیند.
 */
const AUTH_MESSAGES_BY_CODE: Record<
  string,
  { code: ErrorCode; userMessage: string }
> = {
  invalid_credentials: {
    code: ERROR_CODES.AUTHENTICATION,
    userMessage: 'ایمیل یا رمز عبور نادرست است.',
  },
  email_not_confirmed: {
    code: ERROR_CODES.AUTHENTICATION,
    userMessage: 'ابتدا ایمیل خود را تأیید کنید.',
  },
  user_already_exists: {
    code: ERROR_CODES.CONFLICT,
    userMessage: 'این ایمیل قبلاً ثبت‌نام کرده است.',
  },
  email_exists: {
    code: ERROR_CODES.CONFLICT,
    userMessage: 'این ایمیل قبلاً ثبت‌نام کرده است.',
  },
  email_address_invalid: {
    code: ERROR_CODES.VALIDATION,
    userMessage: 'ایمیل واردشده معتبر نیست.',
  },
  weak_password: {
    code: ERROR_CODES.VALIDATION,
    userMessage: 'رمز عبور باید حداقل ۶ کاراکتر باشد.',
  },
  over_request_rate_limit: {
    code: ERROR_CODES.RATE_LIMIT,
    userMessage: 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.',
  },
  over_email_send_rate_limit: {
    code: ERROR_CODES.RATE_LIMIT,
    userMessage: 'درخواست‌های زیادی ارسال شده. کمی بعد دوباره تلاش کنید.',
  },
}

export function getAuthError(
  rawCode: string
): { code: ErrorCode; userMessage: string } | undefined {
  return AUTH_MESSAGES_BY_CODE[rawCode]
}
