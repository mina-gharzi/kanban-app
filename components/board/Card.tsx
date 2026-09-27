'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { isTemporaryId } from '@/lib/board/optimistic'
import type { Card as CardType } from '@/lib/board/types'
import { getDueDateStatus, formatDueDate } from '@/lib/dueDate'

type Props = {
  card: CardType
  onOpen?: (cardId: string) => void
}

export default function Card({ card, onOpen }: Props) {
  // کارتی که هنوز از سرور نیامده جابه‌جا یا ویرایش نمی‌شود؛ شناسه‌اش موقت است
  const isPending = isTemporaryId(card.id)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, disabled: isPending })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const dueDateStatus = getDueDateStatus(card.due_date)

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    // کارت در حال ذخیره در سرور وجود ندارد؛ modal بازکردن یعنی ویرایشِ
    // رکوردی که هرگز ذخیره نمی‌شود
    if (isPending) return
    onOpen?.(card.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (isPending) return
        onOpen?.(card.id)
      }}
      onKeyDown={handleKeyDown}
      aria-busy={isPending}
      className={`bg-card text-surface rounded-lg mb-2 shadow overflow-hidden ${
        isPending
          ? 'opacity-60 cursor-default'
          : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      {card.label_color && (
        <div className="h-1.5 w-full" style={{ backgroundColor: card.label_color }} />
      )}
      <div className="p-3">
        <p className="text-sm">{card.title}</p>
        {card.description && (
          <p className="text-xs text-surface/60 mt-1 line-clamp-2">
            {card.description}
          </p>
        )}
        {card.due_date && (
          <span
            className={`inline-block text-[11px] mt-2 px-2 py-0.5 rounded ${
              dueDateStatus === 'overdue'
                ? 'bg-accent/20 text-accent'
                : dueDateStatus === 'soon'
                ? 'bg-yellow-500/20 text-yellow-500'
                : 'bg-surface/10 text-surface/60'
            }`}
          >
            {formatDueDate(card.due_date)}
          </span>
        )}
      </div>
    </div>
  )
}
