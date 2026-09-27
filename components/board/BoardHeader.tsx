'use client'

import type { Board } from '@/lib/board/types'
import type { RealtimeStatus } from '@/hooks/useBoardRealtime'
import { ColumnIcon } from '@/components/ui/icons'

type Props = {
  board: Board | undefined
  cardCount: number
  realtimeStatus: RealtimeStatus
}

const STATUS_META: Record<
  RealtimeStatus,
  { label: string; dot: string; text: string }
> = {
  connecting: {
    label: 'در حال اتصال',
    dot: 'bg-warning animate-pulse',
    text: 'text-text-muted',
  },
  live: {
    label: 'متصل',
    dot: 'bg-success',
    text: 'text-text-muted',
  },
  error: {
    label: 'ارتباط قطع شد',
    dot: 'bg-danger',
    text: 'text-danger',
  },
}

/**
 * سربرگ بورد.
 *
 * سه چیز و بس: نام بورد (که قبلاً اصلاً نمایش داده نمی‌شد)، تعداد
 * کارت‌ها، و وضعیت Realtime به‌صورت نقطه‌ی رنگی با توضیح متنی.
 * وضعیت بصری تنها با رنگ منتقل نمی‌شود (screen-reader با `sr-only`
 * و `title` هم آن را می‌خواند)، چون برای کاربران کوررنگ قابل
 * تشخیص نیست.
 */
export default function BoardHeader({
  board,
  cardCount,
  realtimeStatus,
}: Props) {
  const status = STATUS_META[realtimeStatus]

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border px-4 py-3 sm:px-6">
      <ColumnIcon size={18} className="shrink-0 text-text-muted" />

      <h1 className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-text">
        {board?.title ?? 'بورد'}
      </h1>

      <span className="shrink-0 rounded-sm bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium tabular text-text-2">
        {cardCount.toLocaleString('fa-IR')} کارت
      </span>

      <span
        className={`ms-auto flex items-center gap-1.5 text-[12px] ${status.text}`}
        title={status.label}
      >
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
        />
        <span className="sr-only">وضعیت ارتباط بلادرنگ: </span>
        {status.label}
      </span>
    </div>
  )
}
