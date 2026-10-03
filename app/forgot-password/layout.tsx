import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// عنوان یکتا برای هر صفحه (WCAG 2.4.2)؛ قالب «%s · کانبان» در layout ریشه است
export const metadata: Metadata = { title: 'بازیابی رمز عبور' }

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
