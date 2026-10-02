'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBoards } from '@/hooks/useBoards'
import { BoardsIcon, PlusIcon } from '@/components/ui/icons'
import { buttonClass } from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import { boardColor, boardInitial } from '@/lib/board/boardColor'
import { readableInk } from '@/lib/labelColors'

type Props = {
  onNavigate: () => void
}

/**
 * نوار کناری = جابه‌جایی سریع بین بوردها.
 *
 * داده‌اش (`useBoards`) و مسیرهایش از قبل در اپ وجود دارند؛ پس یک
 * قابلیت واقعی است، نه feature جدید.
 */
export default function BoardSidebar({ onNavigate }: Props) {
  const { boards, isPending } = useBoards()
  const pathname = usePathname()

  return (
    <nav aria-label="بوردها" className="flex h-full flex-col">
      {/* `uppercase` و `tracking-wider` روی فارسی بی‌معنا‌اند (DESIGN_PLAN.md §۴.۳)؛
         وزن و رنگ، سلسله‌مراتب را می‌سازند. */}
      <div className="hidden h-14 items-center justify-between px-4 lg:flex">
        <p className="flex items-center gap-2 text-chip font-semibold text-text-muted">
          بوردها
          {!isPending && (
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 tabular text-text-2">
              {boards.length.toLocaleString('fa-IR')}
            </span>
          )}
        </p>

        <Link
          href="/boards"
          onClick={onNavigate}
          aria-label="ساخت بورد جدید"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-2 transition-all duration-150 hover:rotate-90 hover:bg-surface-2 hover:text-text"
        >
          <PlusIcon size={15} />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isPending ? (
          <ul className="space-y-1">
            {Array.from({ length: 4 }, (_, index) => (
              <li key={index}>
                <Skeleton className="h-9 w-full rounded-lg" />
              </li>
            ))}
          </ul>
        ) : boards.length === 0 ? (
          <Link
            href="/boards"
            onClick={onNavigate}
            className="mt-1 flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-5 text-center text-meta text-text-muted transition-colors hover:border-primary hover:text-primary"
          >
            <PlusIcon size={16} />
            اولین بورد را بسازید
          </Link>
        ) : (
          <ul className="space-y-1">
            {boards.map((board) => {
              const href = `/board/${board.id}`
              const isActive = pathname === href
              const color = boardColor(board.id)
              return (
                <li key={board.id}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2',
                      'text-meta transition-all duration-150',
                      isActive
                        ? 'bg-primary-soft font-medium text-primary'
                        : 'text-text-2 hover:bg-surface-2 hover:text-text',
                    ].join(' ')}
                  >
                    {/* نوار رنگی کنار آیتم فعال */}
                    <span
                      aria-hidden
                      className={`absolute inset-y-2 inset-s-0 w-1 rounded-full transition-opacity duration-150 ${
                        isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                      }`}
                      style={{ backgroundColor: color, color: readableInk(color) }}
                    />

                    <span
                      aria-hidden
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-chip font-semibold text-text transition-transform duration-150 group-hover:scale-110"
                      style={{ backgroundColor: color }}
                    >
                      {boardInitial(board.title)}
                    </span>

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
          href="/boards"
          onClick={onNavigate}
          className={buttonClass({
            variant: 'ghost',
            size: 'sm',
            fullWidth: true,
            className: 'justify-start text-text-2',
          })}
        >
          <BoardsIcon size={16} />
          همه‌ی بوردها
        </Link>
      </div>
    </nav>
  )
}