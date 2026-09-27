'use client'

import Link from 'next/link'
import ThemeToggle from './ThemeToggle'
import UserMenu from './UserMenu'
import { BoardsIcon, MenuIcon } from '@/components/ui/icons'
import { IconButton } from '@/components/ui/IconButton'

type Props = {
  /** عنوان جاری (مثل نام بورد) — کانون توجه صفحه */
  meta?: React.ReactNode
  onToggleNav?: () => void
  isNavOpen?: boolean
}

/**
 * نوار بالای برنامه.
 *
 * سه ناحیه با وزن بصری متفاوت: برند (راهنمای جای‌جایی)، عنوان جاری
 * (کانون توجه صفحه)، و کنش‌های حساب (ثانویه، سمت مقابل).
 * عمداً شلوغ نیست: Search و Notification در این اپ وجود ندارند و
 * ساختن UI جعلی برای‌شان ممنوع است.
 */
export default function AppHeader({ meta, onToggleNav, isNavOpen = false }: Props) {
  return (
    <header className="z-30 h-14 shrink-0 border-b border-border bg-surface/85 backdrop-blur-md">
      <div className="flex h-full items-center gap-3 px-4 sm:px-6">
        {onToggleNav && (
          <IconButton
            label={isNavOpen ? 'بستن فهرست' : 'باز کردن فهرست'}
            onClick={onToggleNav}
            aria-expanded={isNavOpen}
            className="-ms-1.5 lg:hidden"
          >
            <MenuIcon size={18} />
          </IconButton>
        )}

        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-md text-text transition-opacity hover:opacity-80"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-on-primary">
            <BoardsIcon size={16} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            کانبان
          </span>
        </Link>

        {meta && (
          <div className="flex min-w-0 flex-1 items-center gap-2 border-s border-border ps-3">
            {meta}
          </div>
        )}

        <div className="ms-auto flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
