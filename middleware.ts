import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * محافظتِ سمت سرور از روت‌ها — لایه‌ی دوم، مکملِ `AuthGuard` نه جایگزینش.
 *
 * چرا هنوز `AuthGuard` (client-side) هم لازم است؟
 * middleware فقط سرِ *درخواست* اجرا می‌شود (ناوبری/رفرش). اگر نشست کاربر
 * وسط کار، توی همان صفحه‌ی باز، منقضی شود (مثلاً بعد از چند ساعت)،
 * middleware دوباره اجرا نمی‌شود؛ آن حالت را همان اشتراکِ
 * `onAuthStateChange` توی `useCurrentUser`/`AuthGuard` می‌گیرد. پس این دو
 * لایه مکمل‌اند، نه هم‌پوشان بی‌فایده:
 *   - middleware  → جلوی رندرِ لحظه‌ای صفحه‌ی محافظت‌شده را قبل از هیدریت می‌گیرد
 *   - AuthGuard    → نشستِ منقضی‌شده‌ی وسط استفاده را می‌گیرد
 *
 * `/` از این‌جا به بعد صفحه‌ی معرفیِ عمومی است، نه فهرست بوردها؛ فهرست
 * بوردها به `/boards` منتقل شده. `isProtectedPath` عمداً با
 * `startsWith('/board')` نوشته شده تا هم `/boards` و هم `/board/[id]` را
 * با یک شرط بگیرد.
 */
const REDIRECT_IF_AUTHED = new Set(['/', '/login', '/register'])

function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith('/board')
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // کاربر مهمان که به صفحه‌ی محافظت‌شده می‌رسد: قبل از رندر به /login می‌رود
  if (!user && isProtectedPath(pathname)) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // کاربرِ لاگین‌کرده که سراغ صفحه‌ی معرفی یا فرم ورود/ثبت‌نام می‌رود:
  // این صفحات برایش کاری ندارند، مستقیم به بوردهایش می‌رود
  if (user && REDIRECT_IF_AUTHED.has(pathname)) {
    return NextResponse.redirect(new URL('/boards', request.url))
  }

  // `response` همان چیزی است که `updateSession` ساخته و کوکی‌های رفرش‌شده
  // را دارد؛ برگرداندنِ یک `NextResponse.next()` تازه اینجا آن‌ها را گم می‌کرد.
  return response
}

export const config = {
  matcher: [
    /*
     * روی همه‌ی مسیرها اجرا شود جز فایل‌های استاتیک/تصویر Next و favicon.
     * این‌ها هیچ‌وقت نیاز به بررسی نشست ندارند و اجرای middleware رویشان
     * فقط تأخیر بی‌فایده اضافه می‌کند.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}