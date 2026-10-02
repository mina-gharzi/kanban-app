import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNextPath } from '@/lib/auth/redirects'

/**
 * مقصد لینک‌های ایمیل (تأیید ثبت‌نام و بازیابی رمز): `?code=` را با نشست
 * عوض می‌کند (PKCE)، کوکی نشست را روی پاسخ می‌گذارد و به `next` می‌رود.
 *
 * - `next` فقط مسیر داخلی پذیرفته می‌شود (`safeNextPath`).
 * - کد یک‌بارمصرف است و به مرورگری گره خورده که درخواست را داده (کوکی
 *   code-verifier). اگر لینک در مرورگر یا دستگاه دیگری باز شود، یا منقضی
 *   شده باشد، تبادل شکست می‌خورد و کاربر با پیام روشن به /login می‌رود.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  const failure = () => NextResponse.redirect(new URL('/login?error=link', origin))
  if (!code) return failure()

  const response = NextResponse.redirect(new URL(next, origin))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return failure()

  return response
}
