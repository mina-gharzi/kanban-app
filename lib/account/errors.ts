/** پیام‌های RPCهای حساب (`delete_my_account`، `account_deletion_preview`) به فارسی؛ ناشناخته ⇒ null */
const MAP: ReadonlyArray<readonly [needle: string, message: string]> = [
  ['wrong password', 'رمز عبور درست نیست.'],
  ['account has no password', 'این حساب رمز عبور ندارد و از این راه حذف نمی‌شود. با پشتیبانی تماس بگیرید.'],
  ['invalid shared_boards', 'گزینه‌ی بوردهای مشترک معتبر نیست.'],
  ['not authenticated', 'نشست شما منقضی شده است؛ دوباره وارد شوید.'],
]

export function accountErrorMessage(rawMessage: string | null | undefined): string | null {
  if (!rawMessage) return null
  const text = rawMessage.toLowerCase()
  for (const [needle, message] of MAP) if (text.includes(needle)) return message
  return null
}
