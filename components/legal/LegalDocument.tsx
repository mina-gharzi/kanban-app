import type { ReactNode } from 'react'
import Link from 'next/link'
import { BoardsIcon } from '@/components/ui/icons'
import { LEGAL, isLegalConfigured } from '@/lib/legal/config'

export type LegalSection = { id: string; title: string; content: ReactNode }

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('fa-IR', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  })
}

/** قالب مشترک «حریم خصوصی» و «قوانین»: عنوان، تاریخ، فهرست مطالب و بخش‌های شماره‌دار */
export default function LegalDocument({
  title, intro, sections,
}: { title: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <div className="min-h-dvh bg-bg text-text">
      <div className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary">
              <BoardsIcon size={15} />
            </span>
            {LEGAL.serviceName}
          </Link>
          <nav aria-label="صفحه‌های حقوقی" className="flex gap-4 text-meta text-text-2">
            <Link href="/privacy" className="inline-flex min-h-10 items-center px-1 hover:text-text">حریم خصوصی</Link>
            <Link href="/terms" className="inline-flex min-h-10 items-center px-1 hover:text-text">قوانین</Link>
          </nav>
        </div>
      </div>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-10 focus:outline-none sm:px-6 sm:py-14">
        {!isLegalConfigured() && (
          <div role="note" className="mb-8 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-meta leading-6 text-text">
            <strong>اطلاعات این صفحه ناقص است.</strong> نام مسئول سرویس، ایمیل تماس یا قانون حاکم
            در <code dir="ltr">lib/legal/config.ts</code> پر نشده است. پیش از انتشار پر کنید.
          </div>
        )}

        <h1 className="text-title font-semibold">{title}</h1>
        <p className="mt-2 text-meta text-text-2">آخرین به‌روزرسانی: {formatDate(LEGAL.lastUpdated)}</p>
        <div className="mt-6 text-body leading-8 text-text-2">{intro}</div>

        <nav aria-label="فهرست مطالب" className="mt-8 rounded-xl border border-border bg-surface p-4">
          <p className="text-meta font-semibold text-text">فهرست مطالب</p>
          <ol className="mt-2 grid list-decimal gap-1 ps-6 text-meta sm:grid-cols-2">
            {sections.map((s) => (
              <li key={s.id}><a href={`#${s.id}`} className="text-primary underline-offset-4 hover:underline">{s.title}</a></li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 flex flex-col gap-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-20">
              <h2 id={`${s.id}-h`} className="text-heading font-semibold">
                <span className="tabular text-text-muted">{(i + 1).toLocaleString('fa-IR')}. </span>{s.title}
              </h2>
              <div className="mt-3 text-body leading-8 text-text-2 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_li]:mt-1.5 [&_p+p]:mt-3 [&_strong]:text-text [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:ps-6">
                {s.content}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
