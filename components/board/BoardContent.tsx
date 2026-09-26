'use client'

import { useMemo } from 'react'
import { DndContext, closestCorners } from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useBoardDragAndDrop } from '@/hooks/useBoardDragAndDrop'
import type { CardMutations } from '@/hooks/useCardMutations'
import type { ColumnMutations } from '@/hooks/useColumnMutations'
import { groupCardsByColumn } from '@/lib/board/layout'
import type { Card, Column as ColumnType } from '@/lib/board/types'
import AddColumnForm from './AddColumnForm'
import BoardDragOverlay from './BoardDragOverlay'
import Column from './Column'

type Props = {
  columns: ColumnType[]
  cards: Card[]
  visibleCardIds: Set<string> | null
  cardMutations: CardMutations
  columnMutations: ColumnMutations
  onOpenCard: (cardId: string) => void
}

const NO_CARDS: Card[] = []

export default function BoardContent({
  columns,
  cards,
  visibleCardIds,
  cardMutations,
  columnMutations,
  onOpenCard,
}: Props) {
  const { sensors, activeCard, activeColumn, handleDragStart, handleDragEnd } =
    useBoardDragAndDrop({
      columns,
      cards,
      onCardMove: cardMutations.moveCard,
      onColumnMove: columnMutations.moveColumn,
    })

  const columnIds = useMemo(
    () => columns.map((column) => column.id),
    [columns]
  )
  // داده‌ی مشتق: کارت‌های هر ستون، بدون نگهداری در state
  const cardsByColumn = useMemo(() => groupCardsByColumn(cards), [cards])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-6 overflow-x-auto min-h-screen bg-surface">
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              cards={cardsByColumn.get(column.id) ?? NO_CARDS}
              visibleCardIds={visibleCardIds}
              cardMutations={cardMutations}
              columnMutations={columnMutations}
              onOpenCard={onOpenCard}
            />
          ))}
        </SortableContext>
        <AddColumnForm onAdd={columnMutations.createColumn} />
      </div>

      <BoardDragOverlay activeCard={activeCard} activeColumn={activeColumn} />
    </DndContext>
  )
}
