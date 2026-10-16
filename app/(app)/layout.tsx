'use client'

import type { ReactNode } from 'react'
import AuthGuard from '@/components/AuthGuard'
import AppShell from '@/components/layout/AppShell'
import BoardSidebar from '@/components/layout/BoardSidebar'
import HeaderMeta from '@/components/layout/HeaderMeta'

/**
 * پوسته‌ی مشترک همه‌ی مسیرهای محافظت‌شده.
 *
 * این یک route group است (`(...)` در نام پوشه)، پس URLها تغییر نمی‌کنند:
 * `/boards`, `/board/[boardId]` و `/account` همان‌جا می‌مانند.
 *
 * پیش‌تر هر صفحه جداگانه `<AuthGuard>` و `<AppShell sidebar={BoardSidebar}>`
 * را دور محتوا می‌پیچید. حالا یک بار این‌جا انجام می‌شود؛ به این ترتیب
 * پوسته بین ناوبری‌های داخلی mount باقی می‌ماند و پریدن/دوباره‌رندر شدن
 * هدر و سایدبار از بین می‌رود.
 *
 * `'use client'` لازم است چون `sidebar` یک تابع رندر است و توابع از مرز
 * Server→Client رد نمی‌شوند.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppShell sidebar={BoardSidebar} headerMeta={<HeaderMeta />}>
        {children}
      </AppShell>
    </AuthGuard>
  )
}
