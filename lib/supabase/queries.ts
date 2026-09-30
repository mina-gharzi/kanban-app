import { supabase } from './client'
import { AppError } from '@/lib/errors/AppError'
import { ERROR_CODES } from '@/lib/errors/errorCodes'
import { normalizeError } from '@/lib/errors/normalizeError'
import type {
  Board,
  BoardData,
  Card,
  CardFieldPatch,
  CardPositionUpdate,
  Column,
  ColumnPositionUpdate,
} from '@/lib/board/types'

/**
 * مرز data-access: خطای خام Supabase در همین لایه به AppError تبدیل
 * می‌شود، بنابراین هیچ کامپوننتی خطای Supabase را نمی‌بیند.
 */

/**
 * تضمین اینکه یک write واقعاً سطری را تغییر داده است.
 *
 * چرا لازم است — این یک تله‌ی مستندشده‌ی PostgREST است:
 *
 *   update(...).eq('id', x)   ← بدون `.select()`
 *   delete(...).eq('id', x)
 *
 * با `Prefer: return=minimal` پاسخ بدن خالی است و کتابخانه
 * `{ data: null, error: null }` برمی‌گرداند (`PostgrestBuilder.ts`،
 * شاخه‌ی `body === ''`). یعنی «۱ سطر تغییر کرد»، «۰ سطر تغییر کرد» و
 * «سطر اصلاً برای من قابل دیدن نبود» **همه یکسان** به نظر می‌رسند.
 *
 * RLS هم به این سه‌گانه اضافه نمی‌شود: RLS یک `WHERE` به همان UPDATE
 * اضافه می‌کند، پس سطر غیرمجاز صرفاً «پیدا نمی‌شود» و خطایی هم تولید
 * نمی‌شود. یعنی کاربری که به سطر دیگری دست می‌زند سکوت می‌بیند، نه 403.
 *
 * بدون این بررسی، سناریوی «کلاینت A کارت را ویرایش می‌کند، کلاینت B
 * همان لحظه ستون را حذف می‌کند» باعث می‌شد ویرایش بی‌صدا گم شود، UI
 * موفقیت نشان دهد و rollback هرگز اجرا نشود.
 *
 * کدِ خطا عمداً `NOT_FOUND` است و نه `AUTHORIZATION`: این دو از هم
 * تفکیک‌ناپذیرند و گفتنِ «هست ولی مال تو نیست» به یک attacker یک
 * existence oracle می‌دهد.
 */
export function assertRowsAffected(
  rows: readonly unknown[] | null,
  operation: string
): void {
  if (rows && rows.length > 0) return
  throw new AppError({
    code: ERROR_CODES.NOT_FOUND,
    message: `${operation}: no row was affected (it is missing, or RLS hid it)`,
  })
}

/** اندازه‌ی هر صفحه؛ برابر سقف پیش‌فرض `max-rows` در Supabase. */
const PAGE_SIZE = 1000

/**
 * ستون‌ها و کارت‌های یک بورد، موازی و بدون `.in('column_id', [...])`.
 *
 * چرا نه `.in()`: با ستون‌های زیاد، URL از سقف طول رد می‌شود.
 * چرا نه embed (`columns(*, cards(*))`): embed را نمی‌شود صفحه‌بندی کرد و
 * PostgREST بی‌صدا در `max-rows` قطعش می‌کند، یعنی کارت‌های بورد بزرگ گم
 * می‌شدند. اینجا کارت‌ها با join داخلی روی `columns.board_id` فیلتر و
 * با `range` صفحه‌بندی می‌شوند؛ برای بورد معمولی همان دو درخواست موازی است.
 * ترتیب `position, id` یک ترتیب کاملاً قطعی می‌دهد تا صفحه‌ها همپوشانی
 * یا شکاف نداشته باشند.
 */
export async function getBoardData(boardId: string): Promise<BoardData> {
  const columnsRequest = supabase
    .from('columns')
    .select('*')
    .eq('board_id', boardId)
    .order('position')
    .order('id')

  const cardsRequest = (async (): Promise<Card[]> => {
    const all: Card[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('cards')
        .select('*, columns!inner(board_id)')
        .eq('columns.board_id', boardId)
        .order('position')
        .order('id')
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw normalizeError(error)
      const page = (data ?? []) as Array<Card & { columns?: unknown }>
      for (const row of page) {
        const { columns: _joined, ...card } = row
        all.push(card as Card)
      }
      if (page.length < PAGE_SIZE) return all
    }
  })()

  const [columnsResult, cards] = await Promise.all([columnsRequest, cardsRequest])
  if (columnsResult.error) throw normalizeError(columnsResult.error)

  return { columns: (columnsResult.data ?? []) as Column[], cards }
}

export async function getBoards(): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw normalizeError(error)
  return (data ?? []) as Board[]
}

export async function createBoard(title: string): Promise<Board> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw normalizeError(userError)
  if (!userData.user) {
    throw new AppError({
      code: ERROR_CODES.AUTHENTICATION,
      message: 'createBoard requires an authenticated user',
    })
  }

  const { data, error } = await supabase
    .from('boards')
    .insert({ title, created_by: userData.user.id })
    .select()
    .single()

  if (error) throw normalizeError(error)
  return data as Board
}

export async function deleteBoard(boardId: string) {
  const { data, error } = await supabase
    .from('boards')
    .delete()
    .eq('id', boardId)
    .select('id')
  if (error) throw normalizeError(error)
  assertRowsAffected(data, 'deleteBoard')
}

export async function addCard(
  columnId: string,
  title: string,
  position: number
): Promise<Card> {
  const { data, error } = await supabase
    .from('cards')
    .insert({ column_id: columnId, title, position })
    .select()
    .single()

  if (error) throw normalizeError(error)
  return data as Card
}

export async function deleteCard(cardId: string) {
  const { data, error } = await supabase
    .from('cards')
    .delete()
    .eq('id', cardId)
    .select('id')
  if (error) throw normalizeError(error)
  assertRowsAffected(data, 'deleteCard')
}

/**
 * ویرایش فیلدهای کارت در یک درخواست، با قفل خوش‌بینانه‌ی سطح فیلد.
 *
 * `expected` مقدار خام فیلدهایی است که کاربر در patch دارد و آخرین‌بار
 * دیده است. UPDATE فقط وقتی اعمال می‌شود که همان فیلدها هنوز همان مقدار
 * را داشته باشند (`WHERE title = … AND description IS NULL …`)، پس «بررسی
 * و بعد نوشتن» یک عملیات اتمیک است و پنجره‌ی race ندارد. چون فقط فیلدهای
 * در حال ویرایش قید می‌شوند، تغییر هم‌زمانِ فیلد دیگر (مثلاً جابه‌جایی کارت
 * یا ویرایش توضیحات در حالی که عنوان را عوض می‌کنید) تعارض کاذب نمی‌سازد،
 * و به ستون `updated_at` یا `version` هم نیازی نیست.
 *
 * ۰ سطر با `expected` یعنی: یا فیلد عوض شده (CONFLICT)، یا کارت نیست /
 * RLS پنهانش کرده (NOT_FOUND). این دو با یک SELECT فقط در مسیر شکست
 * تفکیک می‌شوند.
 */
export async function updateCard(
  cardId: string,
  patch: CardFieldPatch,
  expected?: CardFieldPatch
) {
  let query = supabase.from('cards').update(patch).eq('id', cardId)
  for (const [field, value] of Object.entries(expected ?? {})) {
    query = value === null ? query.is(field, null) : query.eq(field, value)
  }
  const { data, error } = await query.select('id')
  if (error) throw normalizeError(error)

  if (expected && (!data || data.length === 0)) {
    const { data: existing, error: probeError } = await supabase
      .from('cards')
      .select('id')
      .eq('id', cardId)
      .maybeSingle()
    if (probeError) throw normalizeError(probeError)
    if (existing) {
      throw new AppError({
        code: ERROR_CODES.CONFLICT,
        message: 'updateCard: a field changed since it was read',
        userMessage: 'این کارت همین حالا در جای دیگری تغییر کرد.',
        retryable: false,
      })
    }
  }
  assertRowsAffected(data, 'updateCard')
}

/**
 * جابه‌جایی گروهی کارت‌ها در **یک** درخواست.
 *
 * چرا RPC و نه bulk upsert؟ کلاینت قبلاً اینجا `upsert(..., { onConflict: 'id' })`
 * می‌زد و همیشه با خطای 23502 شکست می‌خورد:
 *     null value in column "title" of relation "cards" violates not-null constraint
 * چون upsert در PostgREST یک `INSERT ... ON CONFLICT DO UPDATE` واقعی است و
 * Postgres توکن NOT NULL را روی tuple پیشنهادیِ insert، *قبل* از انتخاب شاخه‌ی
 * DO UPDATE بررسی می‌کند. پس نبودن `title` کل دستور را رد می‌کند، حتی وقتی
 * id از قبل وجود دارد. راه درست، UPDATE خالص است.
 *
 * چرا یک درخواست؟ چند update مستقل در تراکنش جدا اجرا می‌شوند؛ اگر یکی شکست
 * بخورد بقیه اعمال شده‌اند و UI بعد از rollback با سرور ناسازگار می‌ماند. یک
 * UPDATE چند-سطری یک تراکنش است: یا همه جابه‌جا می‌شوند یا هیچ‌کدام.
 *
 * ستون‌های دیگر کارت دست‌نخورده می‌مانند، پس ویرایش هم‌زمانِ title/label از
 * سمت کلاینت دیگر با مقدار کهنه‌ی ما بازنویسی نمی‌شود.
 *
 * نیازمندی: `supabase/migrations/20260101000000_move_cards_and_columns.sql`
 */
export async function updateManyCardPositions(updates: CardPositionUpdate[]) {
  if (updates.length === 0) return
  const { error } = await supabase.rpc('move_cards', {
    p_moves: updates.map((update) => ({
      id: update.id,
      column_id: update.column_id,
      position: update.position,
    })),
  })
  if (error) throw normalizeError(error)
}

export async function addColumn(
  boardId: string,
  title: string,
  position: number
): Promise<Column> {
  const { data, error } = await supabase
    .from('columns')
    .insert({ board_id: boardId, title, position })
    .select()
    .single()

  if (error) throw normalizeError(error)
  return data as Column
}

export async function deleteColumn(columnId: string) {
  const { data, error } = await supabase
    .from('columns')
    .delete()
    .eq('id', columnId)
    .select('id')
  if (error) throw normalizeError(error)
  assertRowsAffected(data, 'deleteColumn')
}

export async function updateColumnTitle(columnId: string, title: string) {
  const { data, error } = await supabase
    .from('columns')
    .update({ title })
    .eq('id', columnId)
    .select('id')
  if (error) throw normalizeError(error)
  assertRowsAffected(data, 'updateColumnTitle')
}

/**
 * جابه‌جایی گروهی ستون‌ها؛ یک درخواست و یک تراکنش.
 * دلیل RPC و اشکال upsert، دقیقاً مثل `updateManyCardPositions` است.
 */
export async function updateColumnPositions(updates: ColumnPositionUpdate[]) {
  if (updates.length === 0) return
  const { error } = await supabase.rpc('move_columns', {
    p_moves: updates.map((update) => ({
      id: update.id,
      position: update.position,
    })),
  })
  if (error) throw normalizeError(error)
}
