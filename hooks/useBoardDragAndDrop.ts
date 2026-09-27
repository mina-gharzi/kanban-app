'use client'

import { useCallback, useState } from 'react'
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { planCardMove, planColumnMove } from '@/lib/board/layout'
import { isTemporaryId } from '@/lib/board/optimistic'
import type {
  Card,
  CardPositionUpdate,
  Column,
  ColumnPositionUpdate,
} from '@/lib/board/types'

type Props = {
  columns: Column[]
  cards: Card[]
  onCardMove: (updates: CardPositionUpdate[]) => void
  onColumnMove: (updates: ColumnPositionUpdate[]) => void
}

export type BoardDragAndDrop = {
  sensors: ReturnType<typeof useSensors>
  activeCard: Card | null
  activeColumn: Column | null
  handleDragStart: (event: DragStartEvent) => void
  handleDragEnd: (event: DragEndEvent) => void
}

/**
 * این هوک فقط دو چیز را نگه می‌دارد:
 * ۱) state موقتِ drag (کدام کارت/ستون در حال کشیده شدن است) — Client state
 * ۲) تصمیم «چه چیزی کجا بنشیند» که با توابع pure محاسبه می‌شود
 *    و نتیجه‌اش به‌صورت آرایه‌ی update به لایه‌ی mutation داده می‌شود.
 */
export function useBoardDragAndDrop({
  columns,
  cards,
  onCardMove,
  onColumnMove,
}: Props): BoardDragAndDrop {
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [activeColumn, setActiveColumn] = useState<Column | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const card = cards.find((c) => c.id === event.active.id)
      if (card) {
        // کارت در حال ذخیره، هنوز در سرور وجود ندارد؛ جابه‌جایی‌اش بی‌معناست
        if (isTemporaryId(card.id)) return
        setActiveCard(card)
        return
      }
      const column = columns.find((c) => c.id === event.active.id)
      if (column) setActiveColumn(column)
    },
    [cards, columns]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveCard(null)
      setActiveColumn(null)

      const { active, over } = event
      if (!over) return

      const activeId = String(active.id)
      const overId = String(over.id)

      // ستونی که هنوز ذخیره نشده مقصد جاگزینی نیست: کارتِ در حال ذخیره
      // نبودِ آن ستون در سرور باعث شکست نوشتن position می‌شد
      if (isTemporaryId(overId)) return

      if (columns.some((column) => column.id === activeId)) {
        if (isTemporaryId(activeId)) return
        const updates = planColumnMove(columns, activeId, overId)
        if (updates) onColumnMove(updates)
        return
      }

      if (isTemporaryId(activeId)) return
      const updates = planCardMove(cards, columns, activeId, overId)
      if (updates) onCardMove(updates)
    },
    [cards, columns, onCardMove, onColumnMove]
  )

  return {
    sensors,
    activeCard,
    activeColumn,
    handleDragStart,
    handleDragEnd,
  }
}
