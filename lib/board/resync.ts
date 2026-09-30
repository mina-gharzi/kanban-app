/**
 * تصمیم‌گیری «کِی کش بورد باید از سرور دوباره خوانده شود» (بدون وابستگی به React).
 *
 * Supabase Realtime رویدادهای از‌دست‌رفته را بازپخش نمی‌کند: هر تغییری که
 * وسط قطعی شبکه، خواب لپ‌تاپ یا چرخه‌ی retry اتفاق افتاده برای این تب
 * برای همیشه گم می‌شود. تنها راه هم‌گام‌شدن، خواندن دوباره‌ی داده است.
 */

export type ResyncStatus = 'connecting' | 'live' | 'error'

/** بیشتر از این مدت مخفی‌بودن تب ⇒ احتمال دارد رویدادی گم شده باشد */
export const HIDDEN_RESYNC_THRESHOLD_MS = 30_000

/**
 * ردیاب اتصال مجدد. اولین `live` را نادیده می‌گیرد (همان لحظه useQuery تازه
 * داده گرفته و refetch اضافه است)، ولی هر `live`ِ بعدی — یعنی کانال بین
 * این دو افتاده و برگشته — یک resync می‌خواهد.
 */
export function createResyncTracker() {
  let hasBeenLive = false
  return {
    /** true یعنی همین حالا باید کش دوباره خوانده شود */
    onStatus(next: ResyncStatus): boolean {
      if (next !== 'live') return false
      const isReconnect = hasBeenLive
      hasBeenLive = true
      return isReconnect
    },
  }
}

/** وقتی تب دوباره دیده می‌شود: فقط اگر به‌اندازه‌ی کافی مخفی بوده resync کن */
export function shouldResyncOnVisible(
  hiddenAtMs: number | null,
  nowMs: number,
  thresholdMs: number = HIDDEN_RESYNC_THRESHOLD_MS,
): boolean {
  return hiddenAtMs !== null && nowMs - hiddenAtMs >= thresholdMs
}
