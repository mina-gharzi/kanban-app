export const LABEL_COLORS = [
  { name: 'قرمز', value: 'rgb(190, 49, 68)' },
  { name: 'آبی', value: 'rgb(58, 71, 80)' },
  { name: 'سبز', value: 'rgb(78, 140, 105)' },
  { name: 'زرد', value: 'rgb(200, 160, 60)' },
  { name: 'بنفش', value: 'rgb(120, 90, 160)' },
] as const

const LABEL_VALUES: ReadonlySet<string> = new Set(
  LABEL_COLORS.map((label) => label.value)
)

/**
 * آیا این رشته یکی از لیبل‌های واقعی است؟
 *
 * برای ورودی‌های بیرونی (مثل `?label=…` در URL که کاربر می‌تواند
 * دستکاری کند) لازم است: بدون این بررسی، لینک دست‌کاری‌شده کاربر را به
 * وضعیتی می‌برد که هیچ دکمه‌ای در آن `aria-pressed` ندارد و نتیجه‌اش
 * همیشه خالی است.
 */
export function isKnownLabelColor(value: string): boolean {
  return LABEL_VALUES.has(value)
}