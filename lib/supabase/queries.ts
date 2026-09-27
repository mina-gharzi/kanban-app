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

/** جابه‌جایی گروهی کارت‌ها؛ در صورت خطا throw می‌کند تا لایه UI بتواند rollback کند. */
export async function updateManyCardPositions(updates: CardPositionUpdate[]) {
  const results = await Promise.all(
    updates.map((u) =>
      supabase
        .from('cards')
        .update({ column_id: u.column_id, position: u.position })
        .eq('id', u.id)
    )
  )
  const failed = results.find((result) => result.error)
  if (failed?.error) throw normalizeError(failed.error)
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

/** جابه‌جایی گروهی ستون‌ها؛ در صورت خطا throw می‌کند تا لایه UI بتواند rollback کند. */
export async function updateColumnPositions(updates: ColumnPositionUpdate[]) {
  const results = await Promise.all(
    updates.map((u) =>
      supabase.from('columns').update({ position: u.position }).eq('id', u.id)
    )
  )
  const failed = results.find((result) => result.error)
  if (failed?.error) throw normalizeError(failed.error)
}
