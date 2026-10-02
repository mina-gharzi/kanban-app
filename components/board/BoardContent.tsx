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
import { useBoardPermissions } from './BoardPermissions'
import BoardDragOverlay from './BoardDragOverlay'
import Column from './Column'
import EmptyState from '@/components/ui/EmptyState'
import { ColumnIcon, SearchOffIcon } from '@/components/ui/icons'

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
const fa = (n: number) => n.toLocaleString('fa-IR')

/** بوم نقطه‌ای پشت ستون‌ها؛ ثابت می‌ماند و ستون‌ها روی آن می‌لغزند */
function Canvas({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 text-border opacity-70"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1.25px, transparent 1.25px)',
          backgroundSize: '18px 18px',
        }}
      />
      {children}
    </div>
  )
}

/** ستون‌های شبح‌مانند پشت پیام حالت خالی، تا صفحه‌ی خالی هم «بورد» به نظر برسد */
function GhostColumns() {
  const tilt = ['-rotate-3', 'rotate-0', 'rotate-3']
  const heights = ['h-64', 'h-80', 'h-56']
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden items-center justify-center gap-6 opacity-40 md:flex">
      {tilt.map((t, i) => (
        <div
          key={i}
          className={`${t} ${heights[i]} w-60 rounded-2xl border border-dashed border-border bg-surface/60 p-3`}
        >
          <div className="h-3 w-20 rounded-full bg-surface-2" />
          <div className="mt-4 h-10 rounded-lg bg-surface-2" />
          <div className="mt-2 h-10 rounded-lg bg-surface-2" />
        </div>
      ))}
    </div>
  )
}

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

  const { canEdit } = useBoardPermissions()
  const columnIds = useMemo(() => columns.map((column) => column.id), [columns])
  // داده‌ی مشتق: کارت‌های هر ستون، بدون نگهداری در state
  const cardsByColumn = useMemo(() => groupCardsByColumn(cards), [cards])

  // بورد خالی یعنی کاربر نمی‌داند از کجا شروع کند؛ بوردِ فیلترشده یعنی
  // کاربر دنبال چیزی است که نیست. این دو پیام یکی نیستند.
  if (columns.length === 0) {
    return (
      <Canvas>
        <div className="relative flex flex-1 items-center justify-center p-6">
          <GhostColumns />
          <div className="relative rounded-3xl border border-border bg-bg/90 p-2 shadow-md backdrop-blur">
            <EmptyState
              icon={<ColumnIcon size={22} />}
              title="این بورد هنوز ستونی ندارد"
              description="کارها را در ستون‌ها دسته‌بندی کنید. اولین ستون را از دکمه‌ی «افزودن ستون» بسازید."
            />
            {canEdit && (
              <div className="mx-auto mt-2 w-full max-w-xs pb-4">
                <AddColumnForm onAdd={columnMutations.createColumn} />
              </div>
            )}
          </div>
        </div>
      </Canvas>
    )
  }

  if (isFilterActive && cards.length > 0 && visibleCardIds?.size === 0) {
    return (
      <Canvas>
        <div className="relative flex flex-1 items-center justify-center p-6">
          <div className="rounded-3xl border border-border bg-bg/90 p-2 shadow-md backdrop-blur">
            <EmptyState
              icon={<SearchOffIcon size={22} />}
              title="کارتی با این فیلترها پیدا نشد"
              description="عبارت جست‌وجو یا لیبل انتخاب‌شده را تغییر دهید تا کارت‌های دیگر نمایش داده شوند."
            />
          </div>
        </div>
      </Canvas>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      // متن راهنما و اعلان‌ها به‌جای انگلیسی/UUID پیش‌فرض dnd-kit فارسی می‌شوند
      accessibility={{ screenReaderInstructions, announcements }}
    >
      <Canvas>
        {/* نوار وضعیت: تعداد ستون/کارت + راهنمای کشیدن (فقط دسکتاپ) */}
        <div className="relative flex items-center justify-between gap-3 px-4 pt-3 text-xs text-text-2 sm:px-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg/90 px-2.5 py-1 tabular backdrop-blur">
            {fa(columns.length)} ستون · {fa(cards.length)} کارت
          </span>
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            کارت‌ها را بکشید و در ستون دیگر رها کنید
          </span>
        </div>

        {/* اسکرول افقی روی خودِ بورد: هدر و ابزار ثابت می‌مانند و فقط ستون‌ها
            می‌لغزند. `overscroll-x-contain` زنجیره‌ی اسکرول افقی صفحه را می‌گیرد.
            `min-h-full` + `items-stretch` قد ستون‌ها را یکسان نگه می‌دارد
            (بدنه‌ی ستون یک «ظرف» است، DESIGN_PLAN.md §۵.۳) و ستونِ بلندتر از
            صفحه، اسکرول عمودی همین ناحیه را بزرگ می‌کند. */}
        <div className="relative min-h-0 flex-1 overflow-x-auto overscroll-x-contain px-4 pb-5 pt-3 sm:px-6">
          <div className="flex min-h-full items-stretch gap-4 sm:gap-6">
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
            {canEdit && <AddColumnForm onAdd={columnMutations.createColumn} />}
          </div>
        </div>

        {/* محو لبه‌ها: نشان می‌دهد ستون‌های بیشتری آن‌طرف هست */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-l from-bg to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-linear-to-r from-bg to-transparent" />
      </Canvas>

      <BoardDragOverlay activeCard={activeCard} activeColumn={activeColumn} />
    </DndContext>
  )
}