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

export async function getBoardData(boardId: string): Promise<BoardData> {
  const { data: columns, error: colError } = await supabase
    .from('columns')
    .select('*')
    .eq('board_id', boardId)
    .order('position')

  if (colError) throw normalizeError(colError)
  if (!columns || columns.length === 0) return { columns: [], cards: [] }

  const columnIds = columns.map((c) => c.id)

  const { data: cards, error: cardError } = await supabase
    .from('cards')
    .select('*')
    .in('column_id', columnIds)
    .order('position')

  if (cardError) throw normalizeError(cardError)

  return { columns: columns as Column[], cards: (cards ?? []) as Card[] }
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
  const { error } = await supabase.from('boards').delete().eq('id', boardId)
  if (error) throw normalizeError(error)
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
  const { error } = await supabase.from('cards').delete().eq('id', cardId)
  if (error) throw normalizeError(error)
}

/** ویرایش فیلدهای کارت (عنوان، توضیحات، لیبل، تاریخ سررسید) در یک درخواست. */
export async function updateCard(cardId: string, patch: CardFieldPatch) {
  const { error } = await supabase
    .from('cards')
    .update(patch)
    .eq('id', cardId)
  if (error) throw normalizeError(error)
}

/**
 * جابه‌جایی گروهی کارت‌ها در **یک** درخواست.
 *
 * چرا upsert و نه چند update مستقل؟ چند update مستقل در تراکنش جدا اجرا
 * می‌شوند؛ اگر یکی شکست بخورد، بقیه اعمال شده‌اند و UI بعد از rollback با
 * سرور ناسازگار می‌ماند. یک bulk upsert یک دستور SQL در یک تراکنش است:
 * یا همه‌ی سطرها جابه‌جا می‌شوند یا هیچ‌کدام.
 *
 * تمام idها از داده‌ی سرور می‌آیند، پس شاخه‌ی INSERT در ON CONFLICT اجرا
 * نمی‌شود (و اگر روزی اجرا شد، شکست آن کل دستور را برمی‌گرداند، نه نیمی از آن).
 */
export async function updateManyCardPositions(updates: CardPositionUpdate[]) {
  if (updates.length === 0) return
  const { error } = await supabase
    .from('cards')
    .upsert(
      updates.map((update) => ({
        id: update.id,
        column_id: update.column_id,
        position: update.position,
      })),
      { onConflict: 'id' },
    )
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
  const { error } = await supabase.from('columns').delete().eq('id', columnId)
  if (error) throw normalizeError(error)
}

export async function updateColumnTitle(columnId: string, title: string) {
  const { error } = await supabase
    .from('columns')
    .update({ title })
    .eq('id', columnId)
  if (error) throw normalizeError(error)
}

/** جابه‌جایی گروهی ستون‌ها؛ یک درخواست و یک تراکنش (دلیلش مثل کارت‌ها). */
export async function updateColumnPositions(updates: ColumnPositionUpdate[]) {
  if (updates.length === 0) return
  const { error } = await supabase
    .from('columns')
    .upsert(
      updates.map((update) => ({ id: update.id, position: update.position })),
      { onConflict: 'id' },
    )
  if (error) throw normalizeError(error)
}
