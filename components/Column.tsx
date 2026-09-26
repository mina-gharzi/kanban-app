'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import CardComponent from './Card'
import AddCardForm from './AddCardForm'
import type { Card, Column as ColumnType } from '@/lib/supabase/queries'

type Props = {
  column: ColumnType
  cards: Card[]
  visibleCardIds: Set<string> | null // null یعنی فیلتر فعال نیست، همه دیده بشن
  onAddCard: (columnId: string, title: string) => void
  onDeleteColumn: (columnId: string) => void
  onUpdateColumnTitle: (columnId: string, title: string) => void
  onOpenCard: (card: Card) => void
}

export default function Column({
  column,
  cards,
  visibleCardIds,
  onAddCard,
  onDeleteColumn,
  onUpdateColumnTitle,
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

  const sortedCards = [...cards].sort((a, b) => a.position - b.position)
  const cardIds = sortedCards.map((c) => c.id)

  function saveTitle() {
    const trimmed = draftTitle.trim()
    if (trimmed && trimmed !== column.title) {
      onUpdateColumnTitle(column.id, trimmed)
    } else {
      setDraftTitle(column.title)
    }
    setIsEditingTitle(false)
  }

  return (
    <div
      ref={(node) => {
        setSortableRef(node)
        setDroppableRef(node)
      }}
      style={style}
      className="min-w-[260px] max-w-[260px] bg-column rounded-xl p-3 flex flex-col"
    >
      <div className="flex justify-between items-center mb-3 px-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            {...attributes}
            {...listeners}
            className="text-surface/40 cursor-grab active:cursor-grabbing select-none"
          >
            ⠿
          </span>
          {isEditingTitle ? (
            <input
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle()
                if (e.key === 'Escape') {
                  setDraftTitle(column.title)
                  setIsEditingTitle(false)
                }
              }}
              className="bg-surface/10 text-surface text-sm rounded px-1 outline-none border border-accent min-w-0"
            />
          ) : (
            <h3
              className="text-surface font-medium text-sm truncate"
              onDoubleClick={() => setIsEditingTitle(true)}
            >
              {column.title}
              <span className="text-surface/50 mr-2">({sortedCards.length})</span>
            </h3>
          )}
        </div>
        <button
          onClick={() => onDeleteColumn(column.id)}
          className="text-accent text-xs shrink-0 hover:opacity-70"
        >
          حذف
        </button>
      </div>

      <div className="flex-1 min-h-[10px]">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {sortedCards.map((card) => {
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

      <AddCardForm onAdd={(title) => onAddCard(column.id, title)} />
    </div>
  )
}