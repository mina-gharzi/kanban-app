'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { BoardsIcon } from '@/components/ui/icons'

type Props = {
  title: string
  subtitle: string
  children: ReactNode
  /** لینک متقابل در پای فرم (ورود ⇄ ثبت‌نام) */
  footerLink: { href: string; label: string }
}

/**
 * پوسته‌ی مشترک صفحات ورود/ثبت‌نام.
 *
 * عمداً ساده است: یک کارت باریک وسط صفحه. فرم‌های auth نباید حس
 * «محصول» بدهند؛ هرچه ساکت‌تر، تمرکز روی دو فیلد می‌ماند.
 */
export default function AuthCard({
  title,
  subtitle,
  children,
  footerLink,
}: Props) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-bg p-4">
      <div className="flex items-center gap-2 text-text">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">
          <BoardsIcon size={17} />
        </span>
        <span className="text-base font-semibold tracking-tight">کانبان</span>
      </div>

      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-5">
          <h1 className="text-[17px] font-semibold tracking-tight text-text">
            {title}
          </h1>
          <p className="mt-1 text-[13px] text-text-2">{subtitle}</p>
        </div>

        {children}

        <p className="mt-5 text-center text-[13px] text-text-2">
          <Link
            href={footerLink.href}
            className="rounded font-medium text-primary underline-offset-4 transition-opacity hover:opacity-80 hover:underline"
          >
            {footerLink.label}
          </Link>
        </p>
      </div>
    </div>
  )
}
