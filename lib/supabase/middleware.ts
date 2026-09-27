import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

/**
 * بازخوانی/رفرش نشست از روی کوکی‌های درخواست، مخصوص اجرا در `middleware.ts`.
 *
 * نکته‌ی حیاتی (طبق مستندات رسمی `@supabase/ssr`): هیچ منطقی نباید بین
 * ساخت کلاینت و صدا زدن `auth.getUser()` قرار بگیرد. یک اشتباه کوچک اینجا
 * می‌تواند رفرش توکن را بشکند و کاربرها را به‌طور تصادفی و به‌سختی
 * قابل‌دیباگ از نشست خارج کند.
 *
 * چرا `getUser()` و نه `getSession()`؟
 * `getSession()` فقط کوکی محلی را می‌خواند و به سرور Supabase سر نمی‌زند؛
 * یعنی یک کوکی جعلی یا دستکاری‌شده را هم بدون چک معتبر می‌شمارد.
 * `getUser()` توکن را واقعاً نزد Supabase Auth تأیید می‌کند، پس تنها
 * گزینه‌ی امن برای تصمیمِ «اجازه بده / رد کن» است.
 */
export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // اول روی خودِ request، تا اگر همین تابع پایین‌تر دوباره کوکی را
          // بخواند (مثلاً یک صدازدنِ دیگر به Supabase در همین درخواست)،
          // مقدار تازه را ببیند، نه مقدار کهنه‌ی ابتدای درخواست.
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          // response قبلی را دور می‌ریزیم و از روی request به‌روزشده
          // دوباره می‌سازیم؛ وگرنه کوکی‌های تازه به پاسخِ رفته به مرورگر
          // اضافه نمی‌شدند.
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user }
}