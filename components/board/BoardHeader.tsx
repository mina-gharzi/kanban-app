'use client'

import type { Board } from '@/lib/board/types'
import type { RealtimeStatus } from '@/hooks/useBoardRealtime'
import { boardColor, boardInitial } from '@/lib/board/boardColor'
import { readableInk } from '@/lib/labelColors'
import { ROLE_LABELS, type BoardRole } from '@/lib/sharing/roles'
import Button from '@/components/ui/Button'
import { UsersIcon } from '@/components/ui/icons'

type Props = {
  board: Board | undefined
  cardCount: number
  realtimeStatus: RealtimeStatus
  role: BoardRole
  onShare: () => void
}

const STATUS_META: Record<
  RealtimeStatus,
  { label: string; dot: string; pill: string; ping: boolean }
> = {
  connecting: {
    label: 'در حال اتصال',
    dot: 'bg-warning animate-pulse',
    pill: 'border-warning/30 bg-warning/10 text-text-2',
    ping: false,
  },
  live: {
    label: 'متصل',
    dot: 'bg-success',
    pill: 'border-success/30 bg-success/10 text-text-2',
    ping: true,
  },
  error: {
    label: 'ارتباط قطع شد',
    dot: 'bg-danger',
    pill: 'border-danger/30 bg-danger-soft text-danger',
    ping: false,
  },
}

/**
 * سربرگ بورد: نام، تعداد کارت‌ها و وضعیت Realtime.
 *
 * نشان رنگی کنار نام آیکن تزئینی نیست؛ همان هویت رنگیِ بورد در فهرست و
 * نوار کناری است و کاربر را در سه صفحه به هم وصل می‌کند (§۹ برای آیکن‌های
 * بی‌اطلاعات است، این یکی اطلاعات دارد).
 *
 * وضعیت بصری تنها با رنگ منتقل نمی‌شود: متن، `title` و `sr-only` هم دارد
 * (کاربران کوررنگ). نام بورد بالاترین سطح عنوان است: نقش `title` (§۴.۲).
 */
export default function BoardHeader({ board, cardCount, realtimeStatus, role, onShare }: Props) {
  const status = STATUS_META[realtimeStatus]
  const color = board ? boardColor(board.id) : undefined

  return (
    <div className="relative border-b border-border">
      {/* نوار نازک رنگیِ بورد، بالای سربرگ */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5 bg-border"
        style={color ? { backgroundColor: color } : undefined}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 sm:px-6">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-sm font-semibold text-text shadow-xs"
          style={color ? { backgroundColor: color, color: readableInk(color) } : undefined}
        >
          {board ? boardInitial(board.title) : '…'}
        </span>

        <div className="min-w-0">
          <h1 className="truncate text-title font-semibold leading-tight text-text">
            {board?.title ?? 'بورد'}
          </h1>
          <p className="mt-0.5 text-chip tabular text-text-2">
            {cardCount.toLocaleString('fa-IR')} کارت
          </p>
        </div>

        <div className="ms-auto flex flex-wrap items-center gap-2">
        {role !== 'owner' && (
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-meta text-text-2">
            {ROLE_LABELS[role]}
          </span>
        )}
        <Button variant="secondary" size="sm" onClick={onShare} disabled={!board}>
          <UsersIcon size={15} />
          {role === 'owner' ? 'اشتراک‌گذاری' : 'اعضا'}
        </Button>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-meta transition-colors duration-300 ${status.pill}`}
          title={status.label}
        >
          <span aria-hidden="true" className="relative flex h-2 w-2">
            {status.ping && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${status.dot}`} />
          </span>
          <span className="sr-only">وضعیت ارتباط بلادرنگ: </span>
          {status.label}
        </span>
        </div>
      </div>
    </div>
  )
}