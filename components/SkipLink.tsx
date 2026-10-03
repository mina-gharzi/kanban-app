/**
 * لینک «پرش به محتوا» برای کاربران صفحه‌کلید و screen reader (WCAG 2.4.1):
 * اولین عنصر قابل‌فوکوس صفحه است، تا دیده نشود پنهان می‌ماند و با Tab ظاهر
 * می‌شود. مقصد: `<main id="main-content">` در هر صفحه.
 */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-meta focus:font-medium focus:text-on-primary"
    >
      پرش به محتوای اصلی
    </a>
  )
}
