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

/* -------------------------------------------------------------------------- */
/* خوانایی متن روی رنگ                                                        */
/* -------------------------------------------------------------------------- */

/** رنگ متن ثابت (نه توکن تم): پس‌زمینه‌ی برچسب‌ها در تم روشن و تاریک یکی است */
export const INK_LIGHT = '#ffffff'
export const INK_DARK = '#161616'

function parseColor(css: string): [number, number, number] | null {
  const rgb = css.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  const hex = css.match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  return null
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** نسبت کنتراست WCAG بین دو رنگ (۱ تا ۲۱)؛ null اگر رنگ قابل‌خواندن نباشد */
export function contrastRatio(a: string, b: string): number | null {
  const ca = parseColor(a)
  const cb = parseColor(b)
  if (!ca || !cb) return null
  const [hi, lo] = [luminance(ca), luminance(cb)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * رنگ متنی (سفید یا تیره) که روی `background` بیشترین کنتراست را دارد.
 * `text-text` یک توکن تم است و در تم تاریک روشن می‌شود، پس روی نشان‌های رنگی
 * (که رنگشان تغییر نمی‌کند) نخوانا می‌شد: مثلاً «آبی» در واقع
 * `rgb(58,71,80)` است.
 */
export function readableInk(background: string): string {
  const light = contrastRatio(background, INK_LIGHT)
  const dark = contrastRatio(background, INK_DARK)
  if (light === null || dark === null) return INK_DARK
  return light >= dark ? INK_LIGHT : INK_DARK
}
