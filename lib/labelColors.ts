/**
 * برچسب‌ها در دیتابیس به‌صورت «کلید» ذخیره می‌شوند (red, blue, …) نه رنگ CSS.
 * `value` فقط برای رندر است؛ تغییر پالت داده‌ی قدیمی را بی‌معنا نمی‌کند.
 */
export const LABEL_COLORS = [
  { key: 'red', name: 'قرمز', value: 'rgb(190, 49, 68)' },
  { key: 'blue', name: 'آبی', value: 'rgb(58, 71, 80)' },
  { key: 'green', name: 'سبز', value: 'rgb(78, 140, 105)' },
  { key: 'yellow', name: 'زرد', value: 'rgb(200, 160, 60)' },
  { key: 'purple', name: 'بنفش', value: 'rgb(120, 90, 160)' },
] as const

export type LabelKey = (typeof LABEL_COLORS)[number]['key']

/**
 * کلید معتبر برچسب را از هر ورودی برمی‌گرداند؛ مقدار قدیمی `rgb(...)`
 * (داده‌ی پیش از مهاجرت، یا لینک‌های ذخیره‌شده با `?label=rgb(...)`) هم به
 * کلید نگاشت می‌شود تا ترتیب استقرار مهاجرت و کلاینت مهم نباشد.
 */
export function resolveLabelKey(value: string | null | undefined): LabelKey | null {
  if (!value) return null
  const match = LABEL_COLORS.find((l) => l.key === value || l.value === value)
  return match?.key ?? null
}

export function isKnownLabelKey(value: string): boolean {
  return resolveLabelKey(value) !== null
}

export function labelOf(value: string | null | undefined) {
  const key = resolveLabelKey(value)
  return LABEL_COLORS.find((l) => l.key === key) ?? null
}
