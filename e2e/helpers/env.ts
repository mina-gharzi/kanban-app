import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * بارگذاری `.env.local`.
 *
 * Playwright فرایند جدیدی اجرا می‌کند و `loadEnvConfig` نکست را اجرا نمی‌کند،
 * پس متغیرهای `NEXT_PUBLIC_*` را باید خودمان بخوانیم. فقط برای *ساخت* حساب‌های
 * تست لازم است؛ خودِ اپ در حین اجرا این متغیرها را از طریق Next می‌گیرد.
 *
 * عمداً فقط `anon` key خوانده می‌شود. کاربران تست با همان سطح دسترسی‌ای ساخته
 * می‌شوند که یک کاربر عادی دارد؛ نه با `service_role`. اگر روزی `service_role`
 * به این فایل اضافه شود، تست‌ها دیگر اثباتی برای مجوزدهی نخواهند بود.
 */
export function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([\s\S]*)$/)
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return out
}

export function supabaseConfig(): { url: string; anonKey: string } {
  const env = loadEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY در .env.local پیدا نشد.'
    )
  }
  return { url, anonKey }
}