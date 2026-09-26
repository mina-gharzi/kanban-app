import { supabase } from './client'
import type {
  Board,
  BoardData,
  Card,
  CardFieldPatch,
  CardPositionUpdate,
  Column,
  ColumnPositionUpdate,
} from '@/lib/board/types'

export async function getBoardData(boardId: string): Promise<BoardData> {
  const { data: columns, error: colError } = await supabase
    .from('columns')
    .select('*')
    .eq('board_id', boardId)
    .order('position')

  if (colError) throw colError
  if (!columns || columns.length === 0) return { columns: [], cards: [] }

  const columnIds = columns.map((c) => c.id)

  const { data: cards, error: cardError } = await supabase
    .from('cards')
    .select('*')
    .in('column_id', columnIds)
    .order('position')

  if (cardError) throw cardError

  return { columns: columns as Column[], cards: (cards ?? []) as Card[] }
}

export async function getBoards(): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Board[]
}

export async function createBoard(title: string): Promise<Board> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error('کاربر لاگین نکرده است.')

  const { data, error } = await supabase
    .from('boards')
    .insert({ title, created_by: userId })
    .select()
    .single()

  if (error) throw error
  return data as Board
}

export async function deleteBoard(boardId: string) {
  const { error } = await supabase.from('boards').delete().eq('id', boardId)
  if (error) throw error
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

  if (error) throw error
  return data as Card
}

export async function deleteCard(cardId: string) {
  const { error } = await supabase.from('cards').delete().eq('id', cardId)
  if (error) throw error
}

/** ویرایش فیلدهای کارت (عنوان، توضیحات، لیبل، تاریخ سررسید) در یک درخواست. */
export async function updateCard(cardId: string, patch: CardFieldPatch) {
  const { error } = await supabase
    .from('cards')
    .update(patch)
    .eq('id', cardId)
  if (error) throw error
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
  if (failed?.error) throw failed.error
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

  if (error) throw error
  return data as Column
}

export async function deleteColumn(columnId: string) {
  const { error } = await supabase.from('columns').delete().eq('id', columnId)
  if (error) throw error
}

export async function updateColumnTitle(columnId: string, title: string) {
  const { error } = await supabase
    .from('columns')
    .update({ title })
    .eq('id', columnId)
  if (error) throw error
}

/** جابه‌جایی گروهی ستون‌ها؛ در صورت خطا throw می‌کند تا لایه UI بتواند rollback کند. */
export async function updateColumnPositions(updates: ColumnPositionUpdate[]) {
  const results = await Promise.all(
    updates.map((u) =>
      supabase.from('columns').update({ position: u.position }).eq('id', u.id)
    )
  )
  const failed = results.find((result) => result.error)
  if (failed?.error) throw failed.error
}
