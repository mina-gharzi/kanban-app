import { ROLE_LABELS, type InviteRole } from './roles'

/**
 * متن آماده برای فرستادن به دعوت‌شده (پیام‌رسان، ایمیل شخصی، …).
 * خودِ اپ ایمیل نمی‌فرستد؛ این متن جای آن را می‌گیرد.
 */
export function buildInviteMessage(input: {
  boardTitle: string
  email: string
  role: InviteRole
  origin: string
}): string {
  const { boardTitle, email, role, origin } = input
  return [
    `سلام! شما را با نقش «${ROLE_LABELS[role]}» به بورد «${boardTitle}» در کانبان دعوت کرده‌ام.`,
    '',
    `۱) به این آدرس بروید: ${origin}/login`,
    `۲) با همین ایمیل وارد شوید (اگر حساب ندارید ثبت‌نام کنید و ایمیلتان را تأیید کنید): ${email}`,
    '۳) در صفحه‌ی «بوردهای من»، بخش «دعوت‌های شما» را باز کنید و دعوت را بپذیرید.',
  ].join('\n')
}
