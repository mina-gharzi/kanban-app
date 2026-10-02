/**
 * قفل اسکرول بدنه‌ی صفحه با شمارنده.
 *
 * ذخیره/بازگردانی ساده‌ی `body.style.overflow` در هر مودال با مودال‌های
 * تو‌در‌تو (کارت + تأیید حذف) خراب می‌شد: وقتی هر دو هم‌زمان unmount شوند،
 * اولی مقدار اصلی را برمی‌گرداند و دومی بعدش مقدارِ `hidden` را که خودش
 * «به‌خاطر سپرده» بود، پس صفحه برای همیشه قفل می‌ماند. اینجا فقط اولین قفل
 * مقدار اصلی را نگه می‌دارد و فقط آخرین رهاسازی آن را برمی‌گرداند.
 */
let activeLocks = 0
let savedOverflow = ''

export function lockBodyScroll(): () => void {
  if (activeLocks === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  activeLocks += 1

  let released = false
  return () => {
    if (released) return
    released = true
    activeLocks -= 1
    if (activeLocks === 0) document.body.style.overflow = savedOverflow
  }
}
