import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import {
  copyCookies,
  hasSessionCookie,
  isProtectedPath,
  loginPathFor,
  safeNextPath,
} from '@/lib/auth/redirects'

/**
 * محافظتِ سمت سرور از روت‌ها — لایه‌ی دوم، مکملِ `AuthGuard` نه جایگزینش.
 * (Next 16: نام فایل و تابع `proxy` است؛ `middleware` منسوخ شده.)
 *
 * چرا هنوز `AuthGuard` (client-side) هم لازم است؟
 * این تابع فقط سرِ *درخواست* اجرا می‌شود (ناوبری/رفرش). اگر نشست وسط کار،
 * توی همان صفحه‌ی باز منقضی شود، دوباره اجرا نمی‌شود؛ آن حالت را اشتراکِ
 * `onAuthStateChange` در `useCurrentUser`/`AuthGuard` می‌گیرد.
 *   - proxy      → جلوی رندرِ لحظه‌ای صفحه‌ی محافظت‌شده را قبل از هیدریت می‌گیرد
 *   - AuthGuard  → نشستِ منقضی‌شده‌ی وسط استفاده را می‌گیرد
 *
 * سه نکته‌ی این نسخه:
 * ۱) ریدایرکت‌ها کوکی‌های رفرش‌شده‌ی `updateSession` را کپی می‌کنند
 *    (`copyCookies`)؛ قبلاً فقط مسیر `return response` آن‌ها را نگه می‌داشت.
 * ۲) کاربر مهمان با `?next=` به /login می‌رود و بعد از ورود به همان صفحه
 *    برمی‌گردد. مقدار `next` فقط اگر مسیر داخلی باشد پذیرفته می‌شود.
 * ۳) درخواست بدون کوکی نشست اصلاً `getUser()` نمی‌زند (`hasSessionCookie`)؛
 *    لندینگ برای مهمان‌ها بی‌هزینه می‌شود و کاربر واردشده همچنان تأیید می‌شود.
 * ۴) خطای `updateSession` (مثلاً قطعی سرویس Auth) کل سایت را ۵۰۰ نمی‌کند:
 *    مسیر محافظت‌شده بسته می‌ماند (fail-closed) و صفحه‌های عمومی باز می‌مانند.
 */
const REDIRECT_IF_AUTHED = new Set(['/', '/login', '/register'])

export async function proxy(request: NextRequest) {
  let session: Awaited<ReturnType<typeof updateSession>>
  if (!hasSessionCookie(request.cookies.getAll().map((c) => c.name))) {
    // مهمان: نه کاربری هست نه چیزی برای رفرش؛ رفت‌وبرگشت به سرویس Auth حذف می‌شود
    session = { response: NextResponse.next({ request }), user: null }
  } else {
    try {
      session = await updateSession(request)
    } catch (error) {
      console.error(
        'proxy: updateSession failed',
        error instanceof Error ? error.message : error,
      )
      session = { response: NextResponse.next({ request }), user: null }
    }
  }

  const { response, user } = session
  const { pathname, search, searchParams } = request.nextUrl

  // مهمان روی صفحه‌ی محافظت‌شده: قبل از رندر به /login، با مقصد بازگشت
  if (!user && isProtectedPath(pathname)) {
    return copyCookies(
      response,
      NextResponse.redirect(new URL(loginPathFor(pathname, search), request.url)),
    )
  }

  // کاربر واردشده روی صفحه‌ی معرفی یا فرم ورود/ثبت‌نام: به `next` (اگر امن بود)
  // یا فهرست بوردها
  if (user && REDIRECT_IF_AUTHED.has(pathname)) {
    return copyCookies(
      response,
      NextResponse.redirect(new URL(safeNextPath(searchParams.get('next')), request.url)),
    )
  }

  // `response` همان است که `updateSession` ساخته و کوکی‌های رفرش‌شده را دارد
  return response
}

export const config = {
  matcher: [
    /*
     * همه‌ی مسیرها جز فایل‌های استاتیک. هر درخواستِ عبوری یک `getUser()` یعنی
     * یک رفت‌وبرگشت به سرویس Auth است؛ پس فونت‌ها (`/font/*`، پسوند بزرگ
     * `.TTF` هم) و تصاویر/فایل‌های عمومی بیرون می‌مانند.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|font/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest|woff2?|ttf|otf|TTF)$).*)',
  ],
}
