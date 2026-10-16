import type { Metadata } from 'next'
import Link from 'next/link'
import { buttonClass } from '@/components/ui/Button'
import { SearchOffIcon } from '@/components/ui/icons'

export const metadata: Metadata = {
  title: 'صفحه پیدا نشد',
}

/**
 * صفحه‌ی ۴۰۴ سراسری برای مسیرهای ناموجود. داخل layout ریشه رندر می‌شود،
 * پس همان توکن‌های طراحی و فونت را دارد.
 */
export default function NotFound() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 py-12 text-center focus:outline-none"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-text-muted">
        <SearchOffIcon size={22} />
      </span>
      <div className="space-y-1">
        <p className="text-chip font-medium text-text-muted">خطای ۴۰۴</p>
        <h1 className="text-heading font-medium text-text">این صفحه پیدا نشد</h1>
        <p className="mx-auto max-w-sm text-meta leading-relaxed text-text-2">
          نشانی‌ای که باز کردید وجود ندارد یا جابه‌جا شده است. می‌توانید به
          فهرست بوردها برگردید.
        </p>
      </div>
      <div className="flex flex-col items-center gap-2 sm:flex-row">
        <Link
          href="/boards"
          className={buttonClass({ variant: 'primary', size: 'md' })}
        >
          رفتن به بوردها
        </Link>
        <Link
          href="/"
          className={buttonClass({ variant: 'secondary', size: 'md' })}
        >
          صفحه‌ی اصلی
        </Link>
      </div>
    </main>
  )
}
