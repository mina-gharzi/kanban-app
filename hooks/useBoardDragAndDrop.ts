'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
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
  handleDragCancel: (event: DragCancelEvent) => void
  /** متن راهنما و اعلان‌های فارسی برای Screen Reader */
  screenReaderInstructions: ScreenReaderInstructions
  announcements: Announcements
}

/**
 * این هوک فقط چند چیز را نگه می‌دارد:
 * ۱) state موقتِ drag (کدام کارت/ستون در حال کشیده شدن است) — Client state
 * ۲) سنسورها؛ Pointer برای ماوس/لمس و Keyboard برای صفحه‌کلید
 * ۳) تصمیم «چه چیزی کجا بنشیند» که با توابع pure محاسبه می‌شود
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
    // ماوس و لمس: بدون تغییر رفتار قبلی (فاصله‌ی ۵ پیکسل تا کلیک با
    // drag اشتباه نشود).
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    // صفحه‌کلید: `sortableKeyboardCoordinates` به‌جای جابه‌جایی ۲۵
    // پیکسلی، بین نزدیک‌ترین droppable معتبر (کارت/ستون قابل‌دید) می‌رود.
    //
    // `keyboardCodes` عمداً دستی است تا کلیدهای کار با «باز کردن کارت»
    // قفل نکنند: Space برداشتن/رهاکردن، Enter بازکردن کارت و Escape لغو.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: ['Space'],
        cancel: ['Escape'],
        end: ['Space', 'Enter', 'Tab'],
      },
    })
  )

  // نام قابل‌خواندن هر id، تا اعلان‌های Screen Reader به‌جای UUID
  // («Picked up draggable item 3f9c…») عنوان واقعی کارت/ستون را بگویند.
  const itemNames = useMemo(() => {
    const names = new Map<string, string>()
    for (const card of cards) names.set(card.id, `کارت «${card.title}»`)
    for (const column of columns) names.set(column.id, `ستون «${column.title}»`)
    return names
  }, [cards, columns])

  const describe = useCallback(
    (id: UniqueIdentifier) => itemNames.get(String(id)) ?? 'مورد',
    [itemNames]
  )

  const screenReaderInstructions = useMemo<ScreenReaderInstructions>(
    () => ({
      draggable:
        'برای برداشتن این کارت یا ستون، کلید فاصله را بزنید. در حین جابه‌جایی از کلیدهای جهت‌دار استفاده کنید و با فاصله یا Enter آن را رها کنید. برای باز کردن کارت Enter بزنید و برای لغو جابه‌جایی Escape.',
    }),
    []
  )

  const announcements = useMemo<Announcements>(
    () => ({
      onDragStart: ({ active }) => `${describe(active.id)} برداشته شد.`,
      onDragOver: ({ active, over }) =>
        over
          ? `${describe(active.id)} روی ${describe(over.id)} قرار گرفت.`
          : `${describe(active.id)} دیگر روی ناحیه‌ی معتبری نیست.`,
      onDragEnd: ({ active, over }) =>
        over
          ? `${describe(active.id)} در جای ${describe(over.id)} رها شد.`
          : `${describe(active.id)} رها شد.`,
      onDragCancel: ({ active }) => `جابه‌جایی ${describe(active.id)} لغو شد.`,
    }),
    [describe]
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

  const handleDragCancel = useCallback(() => {
    // rollback لازم نیست: بهینه‌سازی خوش‌بینانه در `onDragStart` اعمال
    // نمی‌شود، بلکه داخل mutation و فقط هنگام drop رخ می‌دهد. پس لغو
    // یعنی فقط برداشتن DragOverlay.
    setActiveCard(null)
    setActiveColumn(null)
  }, [])

  return {
    sensors,
    activeCard,
    activeColumn,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    screenReaderInstructions,
    announcements,
  }
}
