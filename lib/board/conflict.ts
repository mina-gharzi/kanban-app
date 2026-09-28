import type { Card } from '@/lib/board/types'

/**
 * تشخیص تعارض هم‌زمان در ویرایش کارت.
 *
 * چرا مقایسه‌ی مقدار فیلدها و نه `updated_at`؟
 *
 * جدول `cards` در دیتابیس واقعی ستون `updated_at` ندارد (بررسی شد: ستون‌های
 * موجود `id, column_id, title, description, position, created_at, label_color,
 * due_date` هستند). پس تنها راه قابل اتکا، مقایسه‌ی مقدار واقعی فیلدهاست.
 *
 * این روش از مقایسه‌ی timestamp هم دقیق‌تر است: اگر کسی فقط جای کارت را با drag
 * عوض کند، timestamp تغییر می‌کند و یک مقایسه‌ی مبتنی بر زمان تعارضِ الکی
 * می‌ساخت، در حالی که ما اصلاً آن فیلد را در patch نمی‌فرستیم. اینجا فقط وقتی
 * تعارض گزارش می‌شود که واقعاً همان فیلدِ در حال ویرایش، زیر دست ما عوض شده باشد.
 */

/** فیلدهایی که از طریق فرم قابل ویرایش‌اند. */
export const EDITABLE_CARD_FIELDS = ['title', 'description', 'due_date'] as const

export type EditableCardField = (typeof EDITABLE_CARD_FIELDS)[number]

/** سه نسخه‌ای که مقایسه می‌شوند: پایه (زمان باز شدن)، draft کاربر، و سرور. */
export type CardEditValues = Record<EditableCardField, string | null>

/** برچسب فارسی هر فیلد، برای نمایش به کاربر. */
export const CARD_FIELD_LABELS: Record<EditableCardField, string> = {
  title: 'عنوان',
  description: 'توضیحات',
  due_date: 'تاریخ سررسید',
}

/** مقادیر اولیه‌ی فرم از روی کارتِ سرور. */
export function readCardFields(card: Card): CardEditValues {
  return {
    title: card.title,
    // نرمال‌سازی رشته‌ی خالی، وگرنه این تابع با readDraftFields ناهماهنگ می‌شد.
    //
    // ریشه‌ی اختلاف: توضیح قبلیِ همین فایل می‌گفت «سرور null برمی‌گرداند» و
    // به همین دلیل نگاشت `?? null` کافی است. آزمون زنده این ادعا را رد کرد:
    // ستون `description` در دیتابیس واقعی NOT NULL ندارد و رشته‌ی خالی را
    // *عیناً* نگه می‌دارد و برمی‌گرداند (تأیید شده با INSERT و خواندن مجدد).
    //
    // اثر ناهماهنگی: اگر روزی داده‌ای با مقدار خالی وجود داشته باشد (داده‌ی
    // کهنه یا نوشته‌ی بیرونی)، آن‌وقت `base` مقدار خالی می‌گیرد ولی
    // `readDraftFields` برای همان فیلد null می‌دهد. شرط سه‌گانه‌ی تعارض
    // (draft ≠ base و server ≠ base و server ≠ draft) آن‌گاه برای فیلدی که
    // کاربر اصلاً دستش نزده true می‌شود ⇒ تعارض الیگی به کاربر نشان داده
    // می‌شود. نگاشت یکسان در هر دو تابع، این دسته‌ی خطا را حذف می‌کند.
    description: card.description === '' ? null : (card.description ?? null),
    due_date: card.due_date === '' ? null : (card.due_date ?? null),
  }
}

/**
 * draft فرم به همان شکل نرمال‌شده‌ی مقادیر سرور.
 *
 * نرمال‌سازی لازم است چون فرم رشته‌ی خالی را به‌عنوان «پاک شدن» نگه می‌دارد
 * و سرور `null` برمی‌گرداند؛ اگر یکی‌شان نکنیم، هر کارتِ بدون توضیحات به‌طور
 * کاذبی «تغییر کرده» به نظر می‌رسد.
 */
export function readDraftFields(draft: {
  title: string
  description: string
  dueDate: string
}): CardEditValues {
  return {
    // trim عمدی: همان چیزی که ذخیره می‌شود، مبنای مقایسه است
    title: draft.title.trim(),
    description: draft.description === '' ? null : draft.description,
    due_date: draft.dueDate === '' ? null : draft.dueDate,
  }
}

/**
 * فیلدهایی که هم کاربر در آن‌ها تغییر داده و هم سرور مقدارشان را عوض کرده.
 *
 * شرط سه‌گانه:
 *   ۱) کاربر فیلد را تغییر داده باشد  (draft ≠ base)
 *   ۲) سرور فیلد را تغییر داده باشد   (server ≠ base)
 *   ۳) نتیجه‌ی دو طرف فرق کند         (server ≠ draft)
 *
 * شرط ۳ تعارضِ الکی را حذف می‌کند: اگر هر دو به یک مقدار رسیده‌اند، هیچ چیزی
 * بازنویسی نمی‌شود و نباید کاربر را بی‌دلیل نگران کنیم.
 */
export function detectCardEditConflicts(
  base: CardEditValues,
  draft: CardEditValues,
  server: CardEditValues
): EditableCardField[] {
  return EDITABLE_CARD_FIELDS.filter((field) => {
    if (draft[field] === base[field]) return false
    if (server[field] === base[field]) return false
    return server[field] !== draft[field]
  })
}

/**
 * patch نهایی: فقط فیلدهایی که کاربر واقعاً تغییر داده.
 *
 * مهم است که `server` پایه‌ی محاسبه باشد نه `base`: اگر سرور فیلدی را عوض
 * کرده و کاربر دستش نزده، آن فیلد اصلاً در patch نمی‌آید و تغییرِ دیگری
 * بی‌آسیب باقی می‌ماند.
 */
export function buildCardPatch(
  base: CardEditValues,
  draft: CardEditValues
): Partial<Record<EditableCardField, string | null>> {
  const patch: Partial<Record<EditableCardField, string | null>> = {}
  for (const field of EDITABLE_CARD_FIELDS) {
    if (draft[field] !== base[field]) patch[field] = draft[field]
  }
  return patch
}
