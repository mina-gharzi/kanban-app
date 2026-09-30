import { removeColumnAt } from '@/lib/board/optimistic'
import type { BoardData } from '@/lib/board/types'

/**
 * تبدیل رویداد realtime حذف ستون به وضعیت کش.
 *
 * این منطق عمداً pure و جدا از hook است تا قابل تست باشد؛ hook فقط آن را صدا
 * می‌زند. هر دو مسیر (خوش‌بینانه و realtime) از `removeColumnAt` استفاده
 * می‌کنند، پس نتیجه‌شان یکی است و رفتارشان دو شاخه نمی‌شود.
 *
 * سه نکته:
 *
 * ۱) کارت‌های ستون هم باید پاک شوند. حذف ستون در دیتابیس آن‌ها را cascade
 *    می‌کند، ولی رویدادِ هر کارت جداگانه و با تأخیر می‌رسد. تا آن لحظه،
 *    کارت‌های orphan در کش می‌مانند: در هیچ ستونی رندر نمی‌شوند (چون
 *    `groupCardsByColumn` فقط بر اساس ستون‌های موجود گروه می‌سازد) و شمارش
 *    کارت‌های بورد را هم غلط می‌کنند.
 *
 * ۲) این تابع باید idempotent باشد. رویداد DELETE ممکن است دوباره برسد
 *    (مثلاً یک رویداد هم‌زمان با refetch یا تغییری که خودِ ما همین حالا اعمال کرده‌ایم دوباره می‌رسد؛ Realtime رویداد گم‌شده را بازپخش نمی‌کند و کش با refetch بعد از اتصال مجدد هم‌گام می‌شود)، و
 *    مسیر optimistic هم ممکن است رکورد را قبلاً برداشته باشد. چون کارِ ما
 *    filter است، اجرای دوباره بی‌اثر است.
 *
 * ۳) «آیا این ستون مال ماست؟» از روی کش پرسیده می‌شود، نه از روی payload.
 *    با REPLICA IDENTITY DEFAULT، رکورد DELETE در `payload.old` فقط کلید
 *    اصلی دارد؛ ستون `board_id` اصلاً در پیام نیست. پس تنها منبع معتبر برای
 *    تشخیص مالکیت، همین کش است.
 */
export function applyColumnDelete(data: BoardData, deletedId: string): BoardData {
  const isOurs = data.columns.some((column) => column.id === deletedId)
  if (!isOurs) return data

  const { data: next } = removeColumnAt(data, deletedId)
  return next
}
