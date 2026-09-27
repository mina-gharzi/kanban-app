import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Vazirmatn } from 'next/font/google'
import './globals.css'
import ToastContainer from '@/components/ToastContainer'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Providers } from './providers'

/**
 * فونت وزیرمتن: تنها فونت فارسی با کیفیت و variable که هم در Next
 * self-host می‌شود (بدون درخواست به Google در runtime) و هم
 * layout-shift ندارد.
 */
const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-vazirmatn',
})

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
      className={vazirmatn.variable}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-bg text-text antialiased">
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
