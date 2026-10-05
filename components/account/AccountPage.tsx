'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useExportMyData } from '@/hooks/useAccount'
import { reportError } from '@/lib/errors/reportError'
import AppShell from '@/components/layout/AppShell'
import BoardSidebar from '@/components/layout/BoardSidebar'
import Button from '@/components/ui/Button'
import DeleteAccountDialog from './DeleteAccountDialog'

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function Section({ title, description, children, danger = false }: { title: string; description: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section aria-label={title} className={`rounded-2xl border bg-surface p-5 sm:p-6 ${danger ? 'border-danger/40' : 'border-border'}`}>
      <h2 className={`text-heading font-semibold ${danger ? 'text-danger' : 'text-text'}`}>{title}</h2>
      <p className="mt-1.5 text-meta leading-6 text-text-2">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function AccountPage() {
  const { user } = useCurrentUser()
  const exporter = useExportMyData()
  const [isDeleting, setIsDeleting] = useState(false)

  function handleExport() {
    exporter.mutate(undefined, {
      onSuccess: (data) => downloadJson(`kanban-export-${new Date().toISOString().slice(0, 10)}.json`, data),
      onError: (error) => reportError(error, 'account.export'),
    })
  }

  return (
    <AppShell sidebar={BoardSidebar} headerMeta={<span className="text-meta text-text-2">حساب کاربری</span>}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
          <h1 className="text-title font-semibold text-text">حساب کاربری</h1>

          <Section title="اطلاعات حساب" description="ایمیلی که با آن وارد می‌شوید.">
            <p className="break-all text-body text-text" dir="ltr">{user?.email ?? '—'}</p>
            <p className="mt-3 text-meta">
              <Link href="/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">
                تغییر رمز عبور (ارسال لینک به ایمیل)
              </Link>
            </p>
          </Section>

          <Section
            title="دریافت داده‌های من"
            description="یک فایل JSON از همه‌ی بوردها، ستون‌ها و کارت‌هایی که به آن‌ها دسترسی دارید. ایمیل یا هویت اعضای دیگر داخلش نیست."
          >
            <Button variant="secondary" onClick={handleExport} loading={exporter.isPending} disabled={exporter.isPending}>
              {exporter.isPending ? 'در حال آماده‌سازی…' : 'دانلود داده‌ها (JSON)'}
            </Button>
          </Section>

          <Section
            danger
            title="حذف حساب"
            description="حساب و داده‌های شما برای همیشه پاک می‌شود. پیش از تأیید، می‌بینید چه بر سر بوردهایتان می‌آید."
          >
            <Button variant="danger" onClick={() => setIsDeleting(true)}>
              حذف حساب…
            </Button>
          </Section>

          <p className="text-meta text-text-muted">
            <Link href="/privacy" className="underline-offset-4 hover:underline">حریم خصوصی</Link>
            {' · '}
            <Link href="/terms" className="underline-offset-4 hover:underline">قوانین استفاده</Link>
          </p>
        </div>
      </div>

      {isDeleting && <DeleteAccountDialog onClose={() => setIsDeleting(false)} />}
    </AppShell>
  )
}
