import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import ToastContainer from '@/components/ToastContainer'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Providers } from './providers'

/**
 * فونت پینار با `@font-face` در `globals.css` تعریف شده، نه با
 * `next/font/local` — دلیلش در همان‌جا مستند شده. اینجا فقط دو وزنی که
 * در هر صفحه دیده می‌شوند preload می‌شوند تا با `font-display: swap`
 * متن یک‌بار با فونت جایگزین رندر نشود (layout shift).
 *
 * وزن ۵۰۰ فقط در چند چیپ کوچک و وزن ۸۰۰ اصلاً استفاده نمی‌شود، پس
 * preload نمی‌شوند؛ در عوض در همان چیپ‌ها دیرتر می‌رسند و چون متن
 * کوچک و متفاوت با ۴۰۰ است، پرش دیده نمی‌شود.
 */
const PinarPreloads = [
  '/font/PINAR-DS3-REGULAR.TTF',
  '/font/PINAR-BOLD.TTF',
]

export const metadata: Metadata = {
  title: {
    default: 'کانبان — مدیریت کار',
    template: '%s · کانبان',
  },
  description: 'مدیریت بورد و کارهای تیمی با نمای بورد.',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1117' },
  ],
}

/**
 * اسکریپتِ اجرای زودهنگام تم: قبل از اولین رنگ‌آمیزی کلاس `dark` را
 * می‌گذارد تا کاربر در حالت تاریک، لحظه‌ای صفحه‌ی سفند نبیند (FOUC).
 *
 * فقط `class` را تغییر می‌دهد. عمداً `style` یا هیچ صفت دیگری را
 * نمی‌نویسد، چون هر صفتی که سرور نفرستاده و قبل از hydration اضافه
 * شود به‌عنوان mismatch گزارش می‌شود. `color-scheme` در CSS تعریف
 * شده است. تنها جایی است که به `localStorage` مستقیم دست می‌زنیم.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('kanban-theme') || 'system';
    var dark = stored === 'dark' ||
      (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // suppressHydrationWarning: تنها استثنای مجاز. کلاس `dark` را اسکریپت
    // بالا *قبل* از hydration اضافه/حذف می‌کند و این تغییر عمدی است.
    // بدون این، کاربرِ حالت تاریک یک mismatch دائمی می‌بیند. این پرچم
    // فقط یک سطح پایین‌تر را ساکت می‌کند، نه کل درخت را.
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-bg text-text antialiased">
        {PinarPreloads.map((href) => (
          <link
            key={href}
            rel="preload"
            href={href}
            as="font"
            type="font/ttf"
            crossOrigin=""
          />
        ))}
        <Script id="theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <Providers>
          <ThemeProvider>
            {children}
            <ToastContainer />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
