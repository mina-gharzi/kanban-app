'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import CardComponent from './Card'
import AddCardForm from './AddCardForm'
import type { Card, Column as ColumnType } from '@/lib/supabase/queries'

type Props = {
  column: ColumnType
  cards: Card[]
  onAddCard: (columnId: string, title: string) => void
  onDeleteColumn: (columnId: string) => void
  onUpdateColumnTitle: (columnId: string, title: string) => void
  onOpenCard: (card: Card) => void
}

export default function Column({
  column,
  cards,
  onAddCard,
  onDeleteColumn,
  onUpdateColumnTitle,
  onOpenCard,
}: Props) {
  const { setNodeRef } = useDroppable({ id: column.id })

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
      ref={setNodeRef}
      className="min-w-65 max-w-65 bg-column rounded-xl p-3 flex flex-col"
    >
      <div className="flex justify-between items-center mb-3 px-1">
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
            className="bg-surface/10 text-surface text-sm rounded px-1 outline-none border border-accent"
          />
        ) : (
          <h3
            className="text-surface font-medium text-sm"
            onDoubleClick={() => setIsEditingTitle(true)}
          >
            {column.title}
            <span className="text-surface/50 mr-2">({sortedCards.length})</span>
          </h3>
        )}
        <button
          onClick={() => onDeleteColumn(column.id)}
          className="text-accent text-xs hover:opacity-70"
        >
          حذف ستون
        </button>
      </div>

      <div className="flex-1 min-h-2.5">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {sortedCards.map((card) => (
            <CardComponent key={card.id} card={card} onOpen={onOpenCard} />
          ))}
        </SortableContext>
      </div>

      <AddCardForm onAdd={(title) => onAddCard(column.id, title)} />
    </div>
  )
}