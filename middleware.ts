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
 * لیست‌سفید عمدی است: مسیر تازه‌ای که فراموش شود اضافه شود، پیش‌فرض به
 * «محافظت‌نشده» می‌افتد نه برعکس — چون `isProtectedPath` صراحتاً true
 * برمی‌گرداند، نه false.
 */
const AUTH_PAGES = new Set(['/login', '/register'])

function isProtectedPath(pathname: string): boolean {
  return pathname === '/' || pathname.startsWith('/board')
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // کاربر مهمان که به صفحه‌ی محافظت‌شده می‌رسد: قبل از رندر به /login می‌رود
  if (!user && isProtectedPath(pathname)) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // کاربرِ لاگین‌کرده که سراغ فرم ورود/ثبت‌نام می‌رود: نیازی به آن صفحه ندارد
  if (user && AUTH_PAGES.has(pathname)) {
    return NextResponse.redirect(new URL('/', request.url))
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