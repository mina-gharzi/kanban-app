import type { NextResponse } from 'next/server'

/** مقصد پیش‌فرض بعد از ورود یا وقتی `next` نامعتبر است */
export const DEFAULT_AFTER_LOGIN = '/boards'

/**
 * مسیرهایی که نشست لازم دارند: `/board`، `/board/[id]`، `/boards`.
 * `startsWith('/board')` خام هر مسیر دیگری با همین پیشوند (مثلاً `/boardgames`)
 * را هم می‌گرفت.
 */
export function isProtectedPath(pathname: string): boolean {
  return (
    pathname === '/board' ||
    pathname === '/boards' ||
    pathname.startsWith('/board/') ||
    pathname.startsWith('/boards/')
  )
}

/**
 * پارامتر `next` را فقط وقتی می‌پذیرد که یک مسیر داخلیِ همین سایت باشد.
 * بدون این، `/login?next=https://evil.com` بعد از ورود کاربر را به سایت
 * دیگر می‌فرستاد (open redirect). رد می‌شوند: آدرس مطلق، `//host`، `/\host`،
 * کاراکتر کنترلی، و برگشت به صفحه‌های ورود/ثبت‌نام (حلقه).
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback: string = DEFAULT_AFTER_LOGIN,
): string {
  if (!raw || raw.length > 2048) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback
  if (/[\u0000-\u001f\\]/.test(raw)) return fallback

  try {
    const parsed = new URL(raw, 'http://internal.invalid')
    if (parsed.origin !== 'http://internal.invalid') return fallback
    if (parsed.pathname === '/login' || parsed.pathname === '/register') return fallback
  } catch {
    return fallback
  }
  return raw
}

/** آدرس /login با مقصد بازگشت؛ فقط برای مسیرهای امن */
export function loginPathFor(pathname: string, search = ''): string {
  const target = safeNextPath(`${pathname}${search}`, '')
  return target ? `/login?next=${encodeURIComponent(target)}` : '/login'
}

/**
 * کوکی‌های `from` را روی `to` کپی می‌کند. `NextResponse.redirect(...)` یک
 * پاسخ تازه است و کوکی‌های نشستِ رفرش‌شده‌ی `updateSession` را ندارد؛ بدون
 * کپی، توکن رفرش‌شده گم می‌شود و درخواست بعدی با توکن قدیمی (که با
 * refresh-token rotation ممکن است باطل شده باشد) می‌آید.
 */
export function copyCookies(from: NextResponse, to: NextResponse): NextResponse {
  for (const cookie of from.cookies.getAll()) to.cookies.set(cookie)
  return to
}

/**
 * آیا درخواست کوکی نشست Supabase دارد؟ (`sb-<ref>-auth-token` و تکه‌هایش
 * `.0`، `.1`، …؛ کوکی `…-code-verifier` نشست نیست و عمداً تطبیق نمی‌خورد.)
 *
 * بدون این کوکی، کاربری وجود ندارد و چیزی هم برای رفرش نیست؛ پس proxy
 * می‌تواند رفت‌وبرگشت `getUser()` به سرویس Auth را کلاً حذف کند. بازدیدکننده‌ی
 * مهمان (بیشترِ ترافیک صفحه‌ی اصلی) دیگر هزینه‌ای نمی‌دهد. وجود کوکی فقط یعنی
 * «شاید نشست باشد»؛ اعتبارش همچنان با `getUser()` سنجیده می‌شود.
 */
export function hasSessionCookie(cookieNames: readonly string[]): boolean {
  return cookieNames.some((name) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name))
}
