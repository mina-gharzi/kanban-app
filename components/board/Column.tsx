'use client'

import { memo, useMemo, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CardMutations } from '@/hooks/useCardMutations'
import type { ColumnMutations } from '@/hooks/useColumnMutations'
import { isTemporaryId } from '@/lib/board/optimistic'
import type { Card, Column as ColumnType } from '@/lib/board/types'
import AddCardForm from './AddCardForm'
import CardComponent from './Card'
import ColumnHeader from './ColumnHeader'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { PlusIcon } from '@/components/ui/icons'

type Props = {
  column: ColumnType
  cards: Card[] // از قبل بر اساس position مرتب شده است
  visibleCardIds: Set<string> | null // null یعنی فیلتر فعال نیست، همه دیده بشن
  cardMutations: CardMutations
  columnMutations: ColumnMutations
  onOpenCard: (cardId: string) => void
}

function Column({
  column,
  cards,
  visibleCardIds,
  cardMutations,
  columnMutations,
  onOpenCard,
}: Props) {
  // ستونی که هنوز از سرور نیامده: نه جابه‌جا می‌شود، نه عنوانش عوض می‌شود،
  // نه حذف می‌شود و نه کارت تازه می‌گیرد (کارت در ستونِ ناموجود در سرور
  // شکست می‌خورد)
  const isPending = isTemporaryId(column.id)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id,
    disabled: isPending,
  })

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: 'column' },
    disabled: isPending,
    attributes: { roleDescription: 'قابل جابه‌جایی' },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // SortableContext باید ترتیب کامل را بداند تا محاسبه‌ی جای جدید در
  // layout.ts روی داده‌ی واقعی انجام شود، نه روی نمای فیلترشده.
  const cardIds = useMemo(() => cards.map((card) => card.id), [cards])

  // کارت‌های خارج از فیلتر واقعاً از درخت رندر حذف می‌شوند. قبلاً با
  // `display: none` پنهان می‌ماندند: هم در SortableContext و droppableها
  // باقی می‌ماندند (هدف جابه‌جایی نامرئی!) و هم شمارنده‌ی سربرگ
  // تعداد کل را نشان می‌داد نه تعداد نتیجه‌ی فیلتر.
  const visibleCards = useMemo(
    () =>
      visibleCardIds === null
        ? cards
        : cards.filter((card) => visibleCardIds.has(card.id)),
    [cards, visibleCardIds]
  )

  const isFilteredOut = cards.length > 0 && visibleCards.length === 0

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div
        ref={(node) => {
          setSortableRef(node)
          setDroppableRef(node)
        }}
        style={style}
        aria-label={`ستون ${column.title}`}
        className={[
          'flex flex-col rounded-xl border bg-surface-2/60 p-2',
          'transition-colors duration-150',
          // حین Drag ستون فقط محو می‌شود؛ DragOverlay جای آن را می‌گیرد
          isDragging ? 'opacity-40' : 'opacity-100',
          isPending ? 'opacity-60' : 'opacity-100',
          // هایلایت شدن ستون به‌عنوان مقصد Drop
          isOver ? 'border-primary bg-primary-soft/40' : 'border-border',
        ].join(' ')}
      >
        <ColumnHeader
          column={column}
          cardCount={visibleCards.length}
          isPending={isPending}
          dragHandleProps={{ ...attributes, ...listeners }}
          onRename={(title) =>
            columnMutations.updateColumnTitle({ columnId: column.id, title })
          }
          onRequestDelete={() => setIsConfirmingDelete(true)}
        />

        <div className="flex min-h-16 flex-1 flex-col gap-2">
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            {visibleCards.map((card) => (
              <CardComponent key={card.id} card={card} onOpen={onOpenCard} />
            ))}
          </SortableContext>

          {/* جای خالی: هم بورد تازه را صمیمی می‌کند، هم هدف Drop را
              قابل تشخیص می‌سازد (به‌جای فضای صفر که غیرقابل کلیک است) */}
          {isFilteredOut ? (
            <p className="px-1 py-3 text-center text-xs text-text-muted">
              کارتی با این فیلترها نیست
            </p>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-border-2 px-2 py-5 text-center">
              <PlusIcon size={16} className="text-text-muted" />
              <p className="text-xs text-text-muted">هنوز کارتی اینجا نیست</p>
            </div>
          ) : null}
        </div>

        {!isPending && (
          <div className="mt-2">
            <AddCardForm
              onAdd={(title) =>
                cardMutations.createCard({ columnId: column.id, title })
              }
            />
          </div>
        )}
      </div>

      {isConfirmingDelete && (
        <ConfirmDialog
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={() => {
            setIsConfirmingDelete(false)
            columnMutations.deleteColumn(column.id)
          }}
          title="حذف ستون"
          description={`ستون «${column.title}» و همه‌ی کارت‌های داخل آن برای همیشه حذف می‌شود. این عمل قابل بازگشت نیست.`}
          confirmLabel="حذف ستون"
        />
      )}
    </div>
  )
}

export default memo(Column)
