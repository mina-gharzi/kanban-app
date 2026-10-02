/**
 * پیام‌های RPCهای اشتراک‌گذاری (`invite_to_board`، `accept_board_invite`) را
 * به متن فارسی نگاشت می‌کند. برای پیام ناشناخته null برمی‌گرداند تا
 * `normalizeError` عمومی کار کند.
 */
const MAP: ReadonlyArray<readonly [needle: string, message: string]> = [
  ['invalid email', 'نشانی ایمیل معتبر نیست.'],
  ['you are the owner', 'این ایمیل خودِ شماست؛ مالک بورد از قبل دسترسی کامل دارد.'],
  ['already a member', 'این کاربر همین حالا عضو بورد است.'],
  ['too many pending invites', 'تعداد دعوت‌های در انتظار به سقف (۵۰) رسیده است. چند دعوت را لغو کنید.'],
  ['only the board owner', 'فقط مالک بورد می‌تواند دعوت بفرستد.'],
  ['invalid role', 'نقش انتخاب‌شده معتبر نیست.'],
  ['confirm your email first', 'برای پذیرفتن دعوت، اول ایمیل خود را تأیید کنید.'],
  ['invite not found', 'این دعوت دیگر وجود ندارد؛ شاید لغو شده یا قبلاً پذیرفته شده است.'],
  ['not authenticated', 'نشست شما منقضی شده است؛ دوباره وارد شوید.'],
]

export function sharingErrorMessage(rawMessage: string | null | undefined): string | null {
  if (!rawMessage) return null
  const text = rawMessage.toLowerCase()
  for (const [needle, message] of MAP) {
    if (text.includes(needle)) return message
  }
  return null
}
