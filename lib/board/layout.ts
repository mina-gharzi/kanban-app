import type { Card, CardPositionUpdate, Column, ColumnPositionUpdate } from './types'
import { isTemporaryId } from './optimistic'

/** کپی مرتب‌شده بر اساس position (آرایه اصلی دست‌نخورده می‌ماند). */
export function sortByPosition<T extends { position: number }>(
  items: readonly T[],
): T[] {
  return [...items].sort((a, b) => a.position - b.position)
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
 * جابه‌جایی ستون‌ها: موقعیت جدید هر ستون را حساب می‌کند.
 * اگر جابه‌جایی معتبر نباشد (مثلاً رها کردن روی خودش) مقدار null برمی‌گرداند.
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

  return reordered.map((column, index) => ({ id: column.id, position: index }))
}

/**
 * جابه‌جایی کارت: موقعیت نهایی ستون مقصد **و** شماره‌گذاری دوباره‌ی
 * باقی‌مانده‌ی کارت‌های ستون مبدأ را حساب می‌کند.
 *
 * چرا ستون مبدأ هم لازم است؟ اگر جای خالی (hole) در position بماند، شمارش
 * ساده‌ی «تعداد کارت‌ها» برای کارت بعدی به position تکراری می‌رسد و ترتیب
 * بین کلاینت‌های مختلف ناپایدار می‌شود. با بازچینش ۰..n-۱ در هر دو ستون،
 * این تناقض از بین می‌رود و rollback هم دقیقاً قابل بازگرداندن می‌شود.
 *
 * `targetId` می‌تواند آیدی یک کارت یا آیدی ستون باشد (رها کردن روی ستون خالی).
 * ستون‌ها لازم‌اند تا آیدی ناشناخته رد شود؛ وگرنه کارت به ستونی می‌رفت که
 * وجود ندارد و آن جابه‌جایی هرگز نمایش داده نمی‌شد.
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
  // ستون ناشناخته یعنی هیچ ستونی با این شناسه نیست (تایپِ `over` می‌تواند
  // هر رشته‌ای باشد) و ستون موقت یعنی هنوز در سرور ثبت نشده: در هر دو حالت
  // نوشتنِ position بعداً شکست می‌خورد، پس اصلاً mutation ساخته نمی‌شود.
  if (!targetColumn || isTemporaryId(targetColumn.id)) return null

  // کارت سر جای خودش رها شده است
  if (targetColumnId === activeCard.column_id && overCard?.id === activeCardId) {
    return null
  }

  const targetColumnCards = sortByPosition(
    cards.filter((c) => c.column_id === targetColumnId && c.id !== activeCardId),
  )

  let insertIndex = targetColumnCards.length
  if (overCard) {
    const overIndex = targetColumnCards.findIndex((c) => c.id === overCard.id)
    if (overIndex !== -1) insertIndex = overIndex
  }

  const reordered = [...targetColumnCards]
  reordered.splice(insertIndex, 0, { ...activeCard, column_id: targetColumnId })

  const updates: CardPositionUpdate[] = reordered.map((card, index) => ({
    id: card.id,
    column_id: targetColumnId,
    position: index,
  }))

  // جابه‌جایی بین دو ستون: باقی‌مانده‌ی ستون مبدأ دوباره ۰..n-۱ می‌شود.
  // کارتِ در حال جابه‌جایی نباید اینجا بیاید، وگرنه دو update برای یک کارت
  // تولید می‌شد و هر کدام که آخر نوشته شود برنده می‌شد.
  if (targetColumnId !== activeCard.column_id) {
    const sourceColumnCards = sortByPosition(
      cards.filter((c) => c.column_id === activeCard.column_id && c.id !== activeCardId),
    )
    for (const [index, card] of sourceColumnCards.entries()) {
      updates.push({
        id: card.id,
        column_id: activeCard.column_id,
        position: index,
      })
    }
  }

  return updates
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
