/** حداقل طول رمز جدید (ثبت‌نام و بازنشانی). ورود عمداً سخت‌گیرتر نمی‌شود تا رمزهای قدیمی کار کنند. */
export const MIN_PASSWORD_LENGTH = 8

/** bcrypt بیش از ۷۲ بایت را نادیده می‌گیرد؛ بهتر است همین‌جا صریح رد شود */
export const MAX_PASSWORD_BYTES = 72

/**
 * اعتبارسنجی رمز جدید؛ پیام فارسی یا null.
 * `confirm` را فقط وقتی بدهید که فرم فیلد تکرار دارد.
 * (سقف واقعی را تنظیم Supabase هم اعمال می‌کند؛ این فقط بازخورد زودهنگام است.)
 */
export function validateNewPassword(password: string, confirm?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `رمز عبور باید دست‌کم ${MIN_PASSWORD_LENGTH.toLocaleString('fa-IR')} نویسه باشد.`
  }
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return 'رمز عبور بیش از حد طولانی است.'
  }
  if (confirm !== undefined && password !== confirm) {
    return 'رمز عبور و تکرار آن یکسان نیست.'
  }
  return null
}
