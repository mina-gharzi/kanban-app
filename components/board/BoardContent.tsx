'use client'

import { useMemo } from 'react'
import { DndContext, closestCorners } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { useBoardDragAndDrop } from '@/hooks/useBoardDragAndDrop'
import type { CardMutations } from '@/hooks/useCardMutations'
import type { ColumnMutations } from '@/hooks/useColumnMutations'
import { groupCardsByColumn } from '@/lib/board/layout'
import type { Card, Column as ColumnType } from '@/lib/board/types'
import AddColumnForm from './AddColumnForm'
import BoardDragOverlay from './BoardDragOverlay'
import Column from './Column'
import EmptyState from '@/components/ui/EmptyState'
import { ColumnIcon } from '@/components/ui/icons'

type Props = {
  columns: ColumnType[]
  cards: Card[]
  visibleCardIds: Set<string> | null
  isFilterActive: boolean
  cardMutations: CardMutations
  columnMutations: ColumnMutations
  onOpenCard: (cardId: string) => void
}

const NO_CARDS: Card[] = []

export default function BoardContent({
  columns,
  cards,
  visibleCardIds,
  isFilterActive,
  cardMutations,
  columnMutations,
  onOpenCard,
}: Props) {
  const {
    sensors,
    activeCard,
    activeColumn,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    screenReaderInstructions,
    announcements,
  } = useBoardDragAndDrop({
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

  // بورد خالی یعنی کاربر نمی‌داند از کجا شروع کند؛ بوردِ فیلترشده یعنی
  // کاربر دنبال چیزی است که نیست. این دو پیام یکی نیستند.
  if (columns.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          icon={<ColumnIcon size={22} />}
          title="این بورد هنوز ستونی ندارد"
          description="کارها را در ستون‌ها دسته‌بندی کنید. اولین ستون را از دکمه‌ی «افزودن ستون» بسازید."
        />
      </div>
    )
  }

  if (isFilterActive && cards.length > 0 && visibleCardIds?.size === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          icon={<ColumnIcon size={22} />}
          title="کارتی با این فیلترها پیدا نشد"
          description="عبارت جست‌وجو یا لیبل انتخاب‌شده را تغییر دهید تا کارت‌های دیگر نمایش داده شوند."
        />
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      // متن راهنما و اعلان‌ها به‌جای انگلیسی/UUID پیش‌فرض dnd-kit فارسی
      // می‌شوند. همین‌جا به‌صورت `aria-describedby` به هر کارت و ستون
      // می‌چسبد.
      accessibility={{
        screenReaderInstructions,
        announcements,
      }}
    >
      {/* اسکرول افقی روی خودِ بورد: هدر و ابزار ثابت می‌مانند و فقط
          ستون‌ها می‌لغزند. `overscroll-x-contain` جلوی زنجیره‌ی اسکرول
          افقی صفحه را می‌گیرد. */}
      <div className="min-h-0 flex-1 overflow-x-auto overscroll-x-contain px-4 pb-4 pt-3 sm:px-6">
        <div className="flex h-full items-start gap-3">
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
      </div>

      <BoardDragOverlay activeCard={activeCard} activeColumn={activeColumn} />
    </DndContext>
  )
}
