'use client'

import { usePathname } from 'next/navigation'
import { useBoards } from '@/hooks/useBoards'

/**
 * عنوان ناحیه‌ی متای هدر، مشتق از مسیر جاری.
 *
 * پیش‌تر هر صفحه این عنوان را دستی به AppShell می‌داد؛ حالا که پوسته در
 * layout مشترک است، تنها جایی که مسیر جاری را می‌داند همین‌جاست.
 *
 * تا وقتی عنوانی برای نمایش نباشد `null` برمی‌گرداند تا `empty:hidden` در
 * AppHeader کل ناحیه را پنهان کند — وگرنه هنگام بارگذاری نام بورد، یک
 * جداکننده‌ی خالی دیده می‌شد.
 */
export default function HeaderMeta() {
  const pathname = usePathname()
  const { boards } = useBoards()

  if (pathname === '/boards') {
    return <span className="text-meta text-text-2">بوردهای من</span>
  }

  if (pathname === '/account') {
    return <span className="text-meta text-text-2">حساب کاربری</span>
  }

  if (pathname.startsWith('/board/')) {
    const boardId = pathname.split('/')[2]
    const board = boards.find((item) => item.id === boardId)
    if (board?.title) {
      return <span className="truncate text-meta text-text-2">{board.title}</span>
    }
  }

  return null
}
