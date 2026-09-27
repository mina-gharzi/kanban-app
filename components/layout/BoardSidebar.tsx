'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBoards } from '@/hooks/useBoards'
import { ColumnIcon, PlusIcon } from '@/components/ui/icons'
import { buttonClass } from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'

type Props = {
  onNavigate: () => void
}

/**
 * نوار کناری = جابه‌جایی سریع بین بوردها.
 *
 * این آیتم تزئینی نیست: داده‌اش (`useBoards`) و مسیرهایش از قبل در
 * اپ وجود دارند، بنابراین یک قابلیت واقعی اضافه می‌کند بدون آنکه
 * feature جدیدی اختراع شود.
 */
export default function BoardSidebar({ onNavigate }: Props) {
  const { boards, isPending } = useBoards()
  const pathname = usePathname()

  return (
    <nav aria-label="بوردها" className="flex h-full flex-col">
      <div className="hidden h-14 items-center px-4 lg:flex">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          بوردها
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isPending ? (
          <ul className="space-y-1">
            {Array.from({ length: 4 }, (_, index) => (
              <li key={index}>
                <Skeleton className="h-9 w-full" />
              </li>
            ))}
          </ul>
        ) : boards.length === 0 ? (
          <p className="px-2 py-3 text-[13px] leading-relaxed text-text-muted">
            هنوز بوردی نساخته‌اید.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {boards.map((board) => {
              const href = `/board/${board.id}`
              const isActive = pathname === href
              return (
                <li key={board.id}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'flex items-center gap-2.5 rounded-md px-2.5 py-2',
                      'text-[13px] transition-colors duration-150',
                      isActive
                        ? 'bg-primary-soft font-medium text-primary'
                        : 'text-text-2 hover:bg-surface-2 hover:text-text',
                    ].join(' ')}
                  >
                    <ColumnIcon
                      size={16}
                      className={isActive ? 'text-primary' : 'text-text-muted'}
                    />
                    <span className="truncate">{board.title}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border p-2">
        <Link
          href="/"
          onClick={onNavigate}
          className={buttonClass({
            variant: 'ghost',
            size: 'sm',
            fullWidth: true,
            className: 'justify-start text-text-2',
          })}
        >
          <PlusIcon size={16} />
          بوردهای من
        </Link>
      </div>
    </nav>
  )
}
