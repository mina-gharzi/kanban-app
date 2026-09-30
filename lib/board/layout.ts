import type { Card, CardPositionUpdate, Column, ColumnPositionUpdate } from './types'
import { isTemporaryId } from './optimistic'

/**
 * کپی مرتب‌شده بر اساس position؛ در برابری، id ملاک است تا همه‌ی کلاینت‌ها
 * (و هر صفحه‌ی query) دقیقاً یک ترتیب را ببینند.
 */
export function sortByPosition<T extends { position: number; id: string }>(
  items: readonly T[],
): T[] {
  return [...items].sort(
    (a, b) => a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
}

/**
 * کمترین فاصله‌ی مجاز بین دو position همسایه. کمتر از این، میانگین‌گیری از
 * دقت double فاصله می‌گیرد و باید ستون یک‌بار از نو شماره‌گذاری شود.
 */
export const MIN_POSITION_GAP = 1e-6

/**
 * position تازه بین دو همسایه (fractional indexing).
 * `null` یعنی جا تمام شده (یا position تکراری هست) و باید rebalance شود.
 */
export function positionBetween(
  prev: number | undefined,
  next: number | undefined,
): number | null {
  if (prev === undefined && next === undefined) return 0
  if (prev === undefined) return (next as number) - 1
  if (next === undefined) return prev + 1
  if (next - prev < MIN_POSITION_GAP) return null
  return (prev + next) / 2
}

/** کارت‌ها را بر اساس ستون گروه‌بندی می‌کند؛ هر گروه بر اساس position مرتب است. */
export function groupCardsByColumn(
  cards: readonly Card[],
): Map<string, Card[]> {
  const grouped = new Map<string, Card[]>()
  for (const card of cards) {
    const bucket = grouped.get(card.column_id)
    if (bucket) {
      bucket.push(card)
    } else {
      grouped.set(card.column_id, [card])
    }
  }
  for (const [columnId, bucket] of grouped) {
    grouped.set(columnId, sortByPosition(bucket))
  }
  return grouped
}

/**
 * جابه‌جایی ستون‌ها.
 *
 * حالت عادی: فقط **یک** update برای ستونِ جابه‌جاشده (position بین دو
 * همسایه‌ی جدید). دو تب هم‌زمان دیگر روی position کل ستون‌ها با هم رقابت
 * نمی‌کنند. فقط وقتی جا تمام شده باشد، کل ستون‌ها از نو ۰..n-۱ می‌شوند.
 * اگر جابه‌جایی معتبر نباشد (رها کردن روی خودش) null برمی‌گردد.
 */
export function planColumnMove(
  columns: readonly Column[],
  activeColumnId: string,
  overColumnId: string,
): ColumnPositionUpdate[] | null {
  if (activeColumnId === overColumnId) return null

  const ordered = sortByPosition(columns)
  const activeIndex = ordered.findIndex((c) => c.id === activeColumnId)
  const overIndex = ordered.findIndex((c) => c.id === overColumnId)
  if (activeIndex === -1 || overIndex === -1) return null

  const reordered = [...ordered]
  const [moved] = reordered.splice(activeIndex, 1)
  if (!moved) return null
  reordered.splice(overIndex, 0, moved)

  const position = positionBetween(
    reordered[overIndex - 1]?.position,
    reordered[overIndex + 1]?.position,
  )
  if (position === null) {
    return reordered.map((column, index) => ({ id: column.id, position: index }))
  }
  return [{ id: moved.id, position }]
}

/**
 * جابه‌جایی کارت.
 *
 * حالت عادی: فقط **یک** update (ستون مقصد + position بین دو همسایه).
 * ستون مبدأ سوراخ می‌گیرد که با position کسری مشکلی نیست. فقط وقتی جا
 * تمام شده یا position تکراری هست، ستون مقصد از نو ۰..n-۱ می‌شود.
 *
 * رها کردن روی کارت: در ستون دیگر «قبل از» آن کارت؛ در همان ستون رو به
 * پایین «بعد از» آن (مثل arrayMove در dnd-kit و پیش‌نمایشی که کاربر
 * می‌بیند). `targetId` می‌تواند آیدی کارت یا ستون (ستون خالی) باشد.
 */
export function planCardMove(
  cards: readonly Card[],
  columns: readonly Column[],
  activeCardId: string,
  targetId: string,
): CardPositionUpdate[] | null {
  const activeCard = cards.find((c) => c.id === activeCardId)
  if (!activeCard) return null

  const overCard = cards.find((c) => c.id === targetId)
  const targetColumnId = overCard ? overCard.column_id : targetId
  const targetColumn = columns.find((column) => column.id === targetColumnId)
  // ستون ناشناخته یا موقت (هنوز در سرور نیست): mutation ساخته نمی‌شود
  if (!targetColumn || isTemporaryId(targetColumn.id)) return null

  if (overCard?.id === activeCardId) return null

  const sameColumn = targetColumnId === activeCard.column_id
  const target = sortByPosition(
    cards.filter((c) => c.column_id === targetColumnId && c.id !== activeCardId),
  )

  let insertIndex = target.length
  if (overCard) {
    const overIndex = target.findIndex((c) => c.id === overCard.id)
    if (overIndex !== -1) {
      insertIndex = overIndex
      if (sameColumn) {
        const original = sortByPosition(
          cards.filter((c) => c.column_id === targetColumnId),
        )
        const from = original.findIndex((c) => c.id === activeCardId)
        const to = original.findIndex((c) => c.id === overCard.id)
        if (from < to) insertIndex = overIndex + 1
      }
    }
  }

  if (sameColumn) {
    const original = sortByPosition(
      cards.filter((c) => c.column_id === targetColumnId),
    )
    if (original.findIndex((c) => c.id === activeCardId) === insertIndex) return null
  }

  const position = positionBetween(
    target[insertIndex - 1]?.position,
    target[insertIndex]?.position,
  )
  if (position !== null) {
    return [{ id: activeCard.id, column_id: targetColumnId, position }]
  }

  const reordered = [...target]
  reordered.splice(insertIndex, 0, activeCard)
  return reordered.map((card, index) => ({
    id: card.id,
    column_id: targetColumnId,
    position: index,
  }))
}

export function applyColumnPositions(
  columns: readonly Column[],
  updates: readonly ColumnPositionUpdate[],
): Column[] {
  const positionById = new Map(updates.map((u) => [u.id, u.position]))
  return columns.map((column) => {
    const position = positionById.get(column.id)
    return position === undefined ? column : { ...column, position }
  })
}

export function applyCardPositions(
  cards: readonly Card[],
  updates: readonly CardPositionUpdate[],
): Card[] {
  const updateById = new Map(updates.map((u) => [u.id, u]))
  return cards.map((card) => {
    const update = updateById.get(card.id)
    if (!update) return card
    return { ...card, column_id: update.column_id, position: update.position }
  })
}
