'use client'

import { memo, useMemo, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { CardMutations } from '@/hooks/useCardMutations'
import type { ColumnMutations } from '@/hooks/useColumnMutations'
import { validateTitle } from '@/lib/board/validation'
import type { Card, Column as ColumnType } from '@/lib/board/types'
import AddCardForm from './AddCardForm'
import CardComponent from './Card'

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
  const { setNodeRef: setDroppableRef } = useDroppable({ id: column.id })

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id, data: { type: 'column' } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(column.title)
  const [titleError, setTitleError] = useState<string | null>(null)

  const cardIds = useMemo(() => cards.map((card) => card.id), [cards])

  function saveTitle() {
    // خطای اعتبارسنجی کنار فیلد می‌ماند و حالت ویرایش بسته نمی‌شود
    const validationError = validateTitle(draftTitle, 'column')
    if (validationError) {
      setTitleError(validationError.userMessage)
      return
    }
    const trimmed = draftTitle.trim()
    if (trimmed !== column.title) {
      columnMutations.updateColumnTitle({ columnId: column.id, title: trimmed })
    }
    setTitleError(null)
    setIsEditingTitle(false)
  }

  function cancelTitleEdit() {
    setTitleError(null)
    setDraftTitle(column.title)
    setIsEditingTitle(false)
  }

  return (
    <div
      ref={(node) => {
        setSortableRef(node)
        setDroppableRef(node)
      }}
      style={style}
      className="min-w-65 max-w-65 bg-column rounded-xl p-3 flex flex-col"
    >
      <div className="flex justify-between items-center mb-3 px-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            {...attributes}
            {...listeners}
            title="جابه‌جایی ستون"
            aria-label="جابه‌جایی ستون"
            className="text-surface/40 cursor-grab active:cursor-grabbing select-none"
          >
            ⠿
          </span>
          {isEditingTitle ? (
            <div className="flex-1 min-w-0">
              <input
                autoFocus
                value={draftTitle}
                onChange={(e) => {
                  setDraftTitle(e.target.value)
                  setTitleError(null)
                }}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle()
                  if (e.key === 'Escape') cancelTitleEdit()
                }}
                aria-label="عنوان ستون"
                aria-invalid={titleError !== null}
                aria-describedby={titleError ? 'column-title-error' : undefined}
                className="w-full bg-surface/10 text-surface text-sm rounded px-1 outline-none border border-accent"
              />
              {titleError && (
                <p
                  id="column-title-error"
                  role="alert"
                  className="text-accent text-xs mt-1"
                >
                  {titleError}
                </p>
              )}
            </div>
          ) : (
            <h3
              className="text-surface font-medium text-sm truncate"
              title={column.title}
              onDoubleClick={() => setIsEditingTitle(true)}
            >
              {column.title}
              <span className="text-surface/50 mr-2">({cards.length})</span>
            </h3>
          )}
        </div>
        <button
          onClick={() => columnMutations.deleteColumn(column.id)}
          aria-label={`حذف ستون ${column.title}`}
          className="text-accent text-xs shrink-0 hover:opacity-70"
        >
          حذف
        </button>
      </div>

      <div className="flex-1 min-h-2.5">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => {
            const isVisible = visibleCardIds === null || visibleCardIds.has(card.id)
            return (
              <div
                key={card.id}
                style={{ display: isVisible ? 'block' : 'none' }}
              >
                <CardComponent card={card} onOpen={onOpenCard} />
              </div>
            )
          })}
        </SortableContext>
      </div>

      <AddCardForm
        onAdd={(title) =>
          cardMutations.createCard({ columnId: column.id, title })
        }
      />
    </div>
  )
}

export default memo(Column)
