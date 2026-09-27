'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { isTemporaryId } from '@/lib/board/optimistic'
import type { Card as CardType } from '@/lib/board/types'
import { getDueDateStatus, formatDueDate } from '@/lib/dueDate'
import { LABEL_COLORS } from '@/lib/labelColors'
import { CalendarIcon } from '@/components/ui/icons'

type Props = {
  card: CardType
  onOpen?: (cardId: string) => void
}

/** نام لیبل از روی مقدار ذخیره‌شده در دیتابیس؛ برای برچسب قابل‌خواندن. */
function labelNameOf(value: string): string {
  return LABEL_COLORS.find((label) => label.value === value)?.name ?? 'لیبل'
}

const DUE_TONE = {
  overdue: 'text-danger bg-danger-soft',
  soon: 'text-warning bg-warning/10',
  normal: 'text-text-2 bg-surface-2',
} as const

/**
 * یک کارت.
 *
 * سلسله‌مراتب عمداً این است: لیبل، عنوان، پیش‌نمایش توضیح، و در
 * انتها metadata (تاریخ سررسید). هر بخش فقط وقتی رندر می‌شود که
 * واقعاً داده داشته باشد — کارت خالی از بخش‌های بی‌ربط نیست.
 */
export default function Card({ card, onOpen }: Props) {
  // کارتی که هنوز از سرور نیامده جابه‌جا یا ویرایش نمی‌شود؛ شناسه‌اش موقت است
  const isPending = isTemporaryId(card.id)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled: isPending })

  const dueDateStatus = getDueDateStatus(card.due_date)
  const hasDescription = Boolean(card.description?.trim())

  function open() {
    if (isPending) return
    onOpen?.(card.id)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    open()
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={open}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-busy={isPending}
      aria-label={
        isPending ? `${card.title} (در حال ذخیره)` : `باز کردن کارت ${card.title}`
      }
      className={[
        'group relative rounded-lg border border-border bg-surface p-3',
        'transition-[border-color,box-shadow,background-color] duration-150',
        'shadow-xs',
        isPending
          ? 'cursor-default opacity-60'
          : 'cursor-grab hover:border-border-2 hover:shadow-sm active:cursor-grabbing',
        // هنگام Drag خودِ کارتِ اصلی نیمه‌شفاف می‌شود و DragOverlay جای آن را می‌گیرد
        isDragging ? 'opacity-40' : 'opacity-100',
      ].join(' ')}
    >
      {/* لیبل: نوار رنگی بالای کارت، فقط وقتی واقعاً وجود دارد */}
      {card.label_color && (
        <span
          aria-hidden="true"
          className="absolute inset-x-3 top-0 h-0.5 rounded-full"
          style={{ backgroundColor: card.label_color }}
        />
      )}

      <div className={card.label_color ? 'pt-1' : ''}>
        <p className="line-clamp-2 text-[13px] font-medium leading-relaxed text-text">
          {card.title}
        </p>

        {hasDescription && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-2">
            {card.description}
          </p>
        )}

        {(card.due_date || card.label_color) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {card.label_color && (
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-border px-1.5 py-0.5 text-[11px] text-text-2">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: card.label_color }}
                />
                {labelNameOf(card.label_color)}
              </span>
            )}

            {card.due_date && dueDateStatus && (
              <span
                className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] tabular ${DUE_TONE[dueDateStatus]}`}
                title={formatDueDate(card.due_date)}
              >
                <CalendarIcon size={12} />
                {formatDueDate(card.due_date)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
