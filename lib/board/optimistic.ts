import type {
  Card,
  CardFieldPatch,
  CardPositionUpdate,
  Column,
  ColumnPositionUpdate,
} from './types'

/**
 * پیشوند ID موقت. عمداً متفاوت از UUID دیتابیس است تا هر جا در کد
 * (کش، realtime، لایه‌ی UI) بتوان کارت هنوز ذخیره‌نشده را تشخیص داد.
 */
const TEMP_ID_PREFIX = 'optimistic:'

export function createTemporaryId(): string {
  return `${TEMP_ID_PREFIX}${crypto.randomUUID()}`
}

/** آیا این ID متعلق به رکوردی است که هنوز از سرور نیامده است؟ */
export function isTemporaryId(id: string): boolean {
  return id.startsWith(TEMP_ID_PREFIX)
}

/**
 * کارتی که قبل از پاسخ سرور در کش نمایش داده می‌شود.
 * فقط همین یک رکورد موقت است؛ بقیه‌ی کارت‌های ستون دست‌نخورده می‌مانند،
 * پس rollback کردن ایجاد کارت فقط باید همین یک عضو را حذف کند.
 */
export function createOptimisticCard(input: {
  columnId: string
  title: string
  position: number
  now?: string
}): Card {
  return {
    id: createTemporaryId(),
    column_id: input.columnId,
    title: input.title,
    description: null,
    position: input.position,
    created_at: input.now ?? new Date().toISOString(),
    label_color: null,
    due_date: null,
  }
}

export function createOptimisticColumn(input: {
  boardId: string
  title: string
  position: number
}): Column {
  return {
    id: createTemporaryId(),
    board_id: input.boardId,
    title: input.title,
    position: input.position,
  }
}

/**
 * موقعیت بعدی برای کارت جدید.
 * عمداً `max + 1` و نه `count`: اگر داده‌ی سرور جای خالی (hole) داشته باشد،
 * شمارش می‌تواند دو کارت را روی یک position بیندازد و ترتیب ناپایدار شود.
 */
export function nextCardPosition(
  cards: readonly Card[],
  columnId: string
): number {
  let highest = -1
  for (const card of cards) {
    if (card.column_id === columnId && card.position > highest) {
      highest = card.position
    }
  }
  return highest + 1
}

export function nextColumnPosition(columns: readonly Column[]): number {
  return columns.reduce((highest, column) => Math.max(highest, column.position), -1) + 1
}

/* -------------------------------------------------------------------------- */
/*                          جابه‌جایی کارت: snapshot دقیق                     */
/* -------------------------------------------------------------------------- */

export type CardMoveSnapshot = {
  /** همان چیزی که به‌صورت خوش‌بینانه نوشته شد */
  applied: CardPositionUpdate[]
  /** مقدار قبلی دقیقاً برای همان کارت‌ها (قبل از این mutation) */
  previous: CardPositionUpdate[]
}

export function toCardPositionUpdate(card: Card): CardPositionUpdate {
  return { id: card.id, column_id: card.column_id, position: card.position }
}

/**
 * snapshot محدود به همان کارت‌هایی که این mutation جابه‌جا می‌کند.
 * برخلاف snapshot کل بورد، تغییرات هم‌زمانِ بقیه‌ی کارت‌ها را دست نمی‌زند.
 */
export function snapshotCardMove(
  cards: readonly Card[],
  applied: readonly CardPositionUpdate[]
): CardMoveSnapshot {
  const touched = new Set(applied.map((update) => update.id))
  return {
    applied: [...applied],
    previous: cards.filter((card) => touched.has(card.id)).map(toCardPositionUpdate),
  }
}

/**
 * rollback جابه‌جایی: فقط کارت‌هایی برمی‌گردند که هنوز همان مقدار
 * خوش‌بینانه‌ی ما را دارند. اگر mutation بعدی همان کارت را جابه‌جا کرده باشد
 *، آن تغییر حفظ می‌شود و مالکیتش با mutation خودش باقی می‌ماند.
 */
export function restoreCardPositions(
  cards: readonly Card[],
  snapshot: CardMoveSnapshot
): Card[] {
  const previousById = new Map(snapshot.previous.map((item) => [item.id, item]))
  const appliedById = new Map(snapshot.applied.map((item) => [item.id, item]))

  return cards.map((card) => {
    const applied = appliedById.get(card.id)
    const previous = previousById.get(card.id)
    if (!applied || !previous) return card
    if (card.column_id !== applied.column_id || card.position !== applied.position) {
      return card
    }
    return { ...card, column_id: previous.column_id, position: previous.position }
  })
}

/* -------------------------------------------------------------------------- */
/*                        جابه‌جایی ستون: snapshot دقیق                       */
/* -------------------------------------------------------------------------- */

export type ColumnMoveSnapshot = {
  applied: ColumnPositionUpdate[]
  previous: ColumnPositionUpdate[]
}

export function snapshotColumnMove(
  columns: readonly Column[],
  applied: readonly ColumnPositionUpdate[]
): ColumnMoveSnapshot {
  const touched = new Set(applied.map((update) => update.id))
  return {
    applied: [...applied],
    previous: columns
      .filter((column) => touched.has(column.id))
      .map((column) => ({ id: column.id, position: column.position })),
  }
}

export function restoreColumnPositions(
  columns: readonly Column[],
  snapshot: ColumnMoveSnapshot
): Column[] {
  const previousById = new Map(snapshot.previous.map((item) => [item.id, item]))
  const appliedById = new Map(snapshot.applied.map((item) => [item.id, item]))

  return columns.map((column) => {
    const applied = appliedById.get(column.id)
    const previous = previousById.get(column.id)
    if (!applied || !previous) return column
    if (column.position !== applied.position) return column
    return { ...column, position: previous.position }
  })
}

/* -------------------------------------------------------------------------- */
/*                        ویرایش فیلدها: snapshot دقیق                        */
/* -------------------------------------------------------------------------- */

export type CardFieldSnapshot = {
  cardId: string
  /** فیلدهایی که نوشته شدند؛ `undefined` یعنی آن فیلد دست‌نخورده مانده */
  applied: CardFieldPatch
  /** نسخه‌ی کامل کارت پیش از نوشتن؛ نگه‌داشتن کل رکورد، rollback را
   *  دقیق و بدون نیاز به تبدیل نوع ممکن می‌کند. */
  previous: Card
}

export function snapshotCardFields(
  card: Card,
  patch: CardFieldPatch
): CardFieldSnapshot {
  return { cardId: card.id, applied: patch, previous: card }
}

/**
 * rollback ویرایش فیلدها، فقط برای فیلدهایی که هنوز دست‌نخورده‌اند.
 * اگر کاربر همان فیلد را دوباره عوض کرده باشد، تغییر جدید حفظ می‌شود.
 */
export function restoreCardFields(
  cards: readonly Card[],
  snapshot: CardFieldSnapshot
): Card[] {
  const { applied, previous } = snapshot
  return cards.map((card) => {
    if (card.id !== snapshot.cardId) return card
    const restored: Card = {
      ...card,
      title:
        applied.title !== undefined && card.title === applied.title
          ? previous.title
          : card.title,
      description:
        applied.description !== undefined && card.description === applied.description
          ? previous.description
          : card.description,
      label_color:
        applied.label_color !== undefined && card.label_color === applied.label_color
          ? previous.label_color
          : card.label_color,
      due_date:
        applied.due_date !== undefined && card.due_date === applied.due_date
          ? previous.due_date
          : card.due_date,
    }
    const changed =
      restored.title !== card.title ||
      restored.description !== card.description ||
      restored.label_color !== card.label_color ||
      restored.due_date !== card.due_date
    return changed ? restored : card
  })
}

/* -------------------------------------------------------------------------- */
/*                              حذف و بازگردانی                                */
/* -------------------------------------------------------------------------- */

export type RemovedCard = { card: Card; index: number }

/** کارت را از آرایه برمی‌دارد و جای دقیقش را برای rollback نگه می‌دارد. */
export function removeCardAt(cards: readonly Card[], cardId: string): {
  cards: Card[]
  removed: RemovedCard | null
} {
  const index = cards.findIndex((card) => card.id === cardId)
  if (index === -1) return { cards: [...cards], removed: null }
  const card = cards[index]
  if (!card) return { cards: [...cards], removed: null }
  return {
    cards: [...cards.slice(0, index), ...cards.slice(index + 1)],
    removed: { card, index },
  }
}

/** کارت حذف‌شده را دقیقاً به همان جای قبلی برمی‌گرداند. */
export function insertCardAt(cards: readonly Card[], removed: RemovedCard): Card[] {
  const next = [...cards]
  next.splice(Math.min(removed.index, next.length), 0, removed.card)
  return next
}

export type RemovedColumn = {
  column: Column
  index: number
  cards: RemovedCard[]
}

/**
 * حذف ستون، کارت‌های آن را هم با جای دقیقشان از کش برمی‌دارد.
 * برای rollback باید همه‌ی این‌ها برگردند، وگرنه بورد ناقص می‌شود.
 */
export function removeColumnAt(
  data: { columns: Column[]; cards: Card[] },
  columnId: string
): { data: { columns: Column[]; cards: Card[] }; removed: RemovedColumn | null } {
  const columnIndex = data.columns.findIndex((column) => column.id === columnId)
  if (columnIndex === -1) {
    return { data: { columns: [...data.columns], cards: [...data.cards] }, removed: null }
  }
  const column = data.columns[columnIndex]
  if (!column) {
    return { data: { columns: [...data.columns], cards: [...data.cards] }, removed: null }
  }

  const removedCards: RemovedCard[] = []
  const keptCards: Card[] = []
  data.cards.forEach((card, index) => {
    if (card.column_id === columnId) {
      removedCards.push({ card, index })
    } else {
      keptCards.push(card)
    }
  })

  return {
    data: {
      columns: [...data.columns.slice(0, columnIndex), ...data.columns.slice(columnIndex + 1)],
      cards: keptCards,
    },
    removed: { column, index: columnIndex, cards: removedCards },
  }
}

export function insertColumnAt(
  columns: readonly Column[],
  removed: RemovedColumn
): Column[] {
  const next = [...columns]
  next.splice(Math.min(removed.index, next.length), 0, removed.column)
  return next
}

export function insertCardsAt(cards: readonly Card[], removed: RemovedCard[]): Card[] {
  const next = [...cards]
  for (const item of removed) {
    next.splice(Math.min(item.index, next.length), 0, item.card)
  }
  return next
}

/* -------------------------------------------------------------------------- */
/*                    جایگزینی رکورد موقت با رکورد واقعی                     */
/* -------------------------------------------------------------------------- */

/**
 * بعد از موفقیت create، کارت موقت با پاسخ سرور عوض می‌شود.
 * چون طول آرایه ثابت می‌ماند، React فقط همان یک کارت را دوباره رندر می‌کند.
 *
 * اگر نسخه‌ی واقعی از قبل در کش نشسته باشد (رویداد INSERT پیش از آزادسازی
 * ردیابی رسیده یا کش بعداً از سرور پر شده)، آن نسخه اول حذف می‌شود تا یک
 * کارت دو بار در کش ننشیند؛ در غیر این صورت کارت موقت و واقعی جدا می‌ماند.
 */
export function replaceTemporaryCard(
  cards: readonly Card[],
  temporaryId: string,
  serverCard: Card
): Card[] {
  const withoutServerCopy = cards.filter((card) => card.id !== serverCard.id)
  const index = withoutServerCopy.findIndex((card) => card.id === temporaryId)
  if (index === -1) return [...withoutServerCopy, serverCard]

  const next = [...withoutServerCopy]
  const existing = next[index]
  if (existing) next[index] = serverCard
  return next
}

export function replaceTemporaryColumn(
  columns: readonly Column[],
  temporaryId: string,
  serverColumn: Column
): Column[] {
  const withoutServerCopy = columns.filter((column) => column.id !== serverColumn.id)
  const index = withoutServerCopy.findIndex((column) => column.id === temporaryId)
  if (index === -1) return [...withoutServerCopy, serverColumn]

  const next = [...withoutServerCopy]
  const existing = next[index]
  if (existing) next[index] = serverColumn
  return next
}
