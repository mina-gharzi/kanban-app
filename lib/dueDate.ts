/**
 * محاسبه و نمایش تاریخ سررسید.
 *
 * ## چرا این ماژول وجود دارد و چرا این‌قدر سخت‌گیر است؟
 *
 * مقدار `due_date` یک رشته‌ی **تاریخ بدون ساعت** است (`YYYY-MM-DD`) که
 * از `<input type="date">` می‌آید و در دیتابیس هم تاریخِ تنهاست. این مقدار
 * «یک روز از تقویم» است، نه «یک لحظه از زمان».
 *
 * اما `new Date('2026-09-28')` طبق spec جاوااسکریپت **UTC** تفسیر می‌شود
 * (ISO 8601 date-only). در timezoneهای منفی نسبت به UTC این یعنی:
 *
 *     new Date('2026-09-28')            → 2026-09-28T00:00:00Z
 *     در America/New_York (UTC-4)      → 2026-09-27T20:00:00  local
 *     بعد از setHours(0,0,0,0)         → 2026-09-27T00:00:00  local  ← یک روز عقب!
 *
 * یعنی کاربری در نیویورک سررسیدِ ۲۸ سپتامبر را «۲۷ سپتامبر» می‌بیند و
 * وضعیت `overdue` / `soon` هم یک روز زودتر محاسبه می‌شود.
 *
 * راه درست: تاریخ بدون ساعت را به‌صورت **تاریخ تقویم محلی** بسازیم، نه
 * به‌عنوان یک لحظه‌ی UTC. برای همه‌ی کمک‌تابع‌های این فایل از همین یک
 * تابع مشترک استفاده می‌شود تا نمایش و وضعیت هرگز با هم اختلاف نداشته باشند.
 *
 * تاریخ‌هایی که واقعاً ساعت دارند (مثل `created_at` از سرور) عمداً از همین
 * مسیر عبور نمی‌کنند و رفتار قبلی `new Date(...)` را نگه می‌دارند.
 */

export type DueDateStatus = 'overdue' | 'soon' | 'normal'

/** فقط الگوی تاریخ تقویمی، بدون بخش ساعت. */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * الگوی «شبیه تاریخ» ولی نادرست، مثل `2026-1-1` یا `26-01-01`.
 *
 * این‌ها را عمداً رد می‌کنیم. اگر به `new Date` برسند، تفسیرشان
 * **موتور-به-موتور و وابسته به locale** است و در بعضی محیط‌ها به UTC
 * تفسیر می‌شوند — یعنی دقیقاً همان باگی که این ماژول برای جلوگیری از آن
 * نوشته شده. مقدار `<input type="date">` همیشه `YYYY-MM-DD` صفر-پرشده
 * است، پس این ورودی‌ها از کاربر نمی‌آیند و فقط داده‌ی خراب یا دستی‌اند.
 */
const MALFORMED_DATE_ONLY = /^\d{1,4}-\d{1,2}-\d{1,2}$/

/**
 * تبدیل رشته‌ی تاریخ به `Date` در **زمان محلی کاربر**.
 *
 * - ورودی `YYYY-MM-DD` → نیمه‌شبِ همان روز در زمان محلی (نه UTC).
 * - ورودی با ساعت (ISO کامل) → همان رفتار قبلی `new Date(value)`؛ این‌ها
 *   «لحظه» هستند نه «روز»، پس تبدیل timezone برایشان غلط است.
 * - ورودی نامعتبر → `null`.
 */
function toLocalDate(value: string): Date | null {
  const match = DATE_ONLY.exec(value)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])

    const date = new Date(year, month - 1, day)
    // جاوااسکریپت تاریخ سرریزی را بی‌صدا جلو می‌برد: `2026-02-30` می‌شود
    // ۲ مارس. اگر اجازه بدهیم، ورودی نامعتبر یک روز کاملاً متفاوت تولید
    // می‌کند و کاربر هیچ‌وقت متوجه نمی‌شود چرا. پس جلویش را می‌گیریم.
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null
    }
    return date
  }

  // اینجا فقط وقتی می‌رسیم که قالب سخت‌گیرانه نبوده. حالا رشته‌هایی که
  // «شبیه تاریخ ولی نادرست» هستند را رد می‌کنیم تا به `new Date` نرسند.
  if (MALFORMED_DATE_ONLY.test(value)) return null

  const withTime = new Date(value)
  return Number.isNaN(withTime.getTime()) ? null : withTime
}

/** نیمه‌شبِ همان روز در زمان محلی؛ مبنای مقایسه‌ی «روز». */
function startOfLocalDay(date: Date): Date {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

/**
 * اختلاف روزِ تقویمی بین دو تاریخ.
 *
 * از تفاضل میلی‌ثانیه‌ها با `Math.round` استفاده می‌شود و نه شمارش ساده‌ی
 * ۲۴ ساعته: در روزهای تغییر ساعت تابستانی، فاصله‌ی دو نیمه‌شب می‌تواند
 * ۲۳ یا ۲۵ ساعت باشد. گرد کردن هر دو را به روز صحیحِ تقویمی می‌رساند.
 */
function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

/**
 * وضعیت سررسید نسبت به امروزِ کاربر.
 *
 * `soon` یعنی امروز تا دو روز دیگر (۰، ۱ یا ۲ روز جلوتر). مقدار `null`
 * یعنی سررسیدی تنظیم نشده یا مقدار ذخیره‌شده قابل تفسیر نیست.
 */
export function getDueDateStatus(dueDate: string | null): DueDateStatus | null {
  if (!dueDate) return null

  const due = toLocalDate(dueDate)
  if (!due) return null

  const diffDays = calendarDaysBetween(startOfLocalDay(new Date()), startOfLocalDay(due))

  if (diffDays < 0) return 'overdue'
  if (diffDays <= 2) return 'soon' // امروز، فردا، پس‌فردا
  return 'normal'
}

/** نمایش کوتاه تاریخ سررسید به تقویم فارسی. */
export function formatDueDate(dueDate: string): string {
  const date = toLocalDate(dueDate)
  if (!date) return ''
  return date.toLocaleDateString('fa-IR', {
    month: 'short',
    day: 'numeric',
  })
}
