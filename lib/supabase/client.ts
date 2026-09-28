import { createBrowserClient } from '@supabase/ssr'

/**
 * کلاینت Supabase برای اجزای client-side.
 *
 * چرا `createBrowserClient` از `@supabase/ssr` و نه `createClient` خام از
 * `@supabase/supabase-js`؟
 *
 * نشست (session) این‌جا در کوکی ذخیره می‌شود، نه فقط `localStorage`.
 * بدون این، middleware — که خارج از runtime اصلی اپ اجرا می‌شود و اصلاً به
 * `localStorage` مرورگر دسترسی ندارد — هیچ‌وقت نمی‌توانست بفهمد کاربر لاگین
 * کرده یا نه، و محافظت سمت سرور از روت‌ها اصلاً ممکن نبود.
 *
 * رفتار قابل‌مشاهده برای بقیه‌ی کد بدون تغییر می‌ماند: همان متدهای
 * `auth.getSession`, `auth.onAuthStateChange`, `.from(...)`, `.channel(...)`
 * از قبل. هیچ فایل دیگری (queries.ts، auth.ts، useCurrentUser.ts،
 * useBoardRealtime.ts) نیازی به تغییر ندارد.
 *
 * نیازمند نصب: `npm install @supabase/ssr`
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)