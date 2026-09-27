'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import Board from '@/components/board/Board'

export default function BoardPage() {
  const params = useParams()
  const boardId = params.boardId as string

  return (
    <AuthGuard>
      {/*
        `Board` از `useSearchParams` استفاده می‌کند (فیلتر در URL ذخیره
        می‌شود). مستندات Next می‌گوید صفحه‌ای که static prerender می‌شود
        بدون Suspense با missing-suspense-with-csr-bailout شکست می‌خورد.

        در وضعیت فعلی این مسیر dynamic است و Suspense لازم ندارد، ولی
        عمدی است: هم به قرارداد مستندات نزدیک می‌مانیم و هم اگر بعداً
        مسیر static شد، شکست prerender اتفاق نیفتد. fallback دیده نمی‌شود
        چون AuthGuard تا تأیید نشست «در حال بررسی» نشان می‌دهد.
      */}
      <Suspense fallback={null}>
        <Board boardId={boardId} />
      </Suspense>
    </AuthGuard>
  )
}
