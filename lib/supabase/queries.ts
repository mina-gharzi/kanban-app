import { supabase } from './client'

export type Column = {
  id: string
  board_id: string
  title: string
  position: number
}

export type Card = {
  id: string
  column_id: string
  title: string
  description: string | null
  position: number
  created_at: string
}

export async function getBoardData(boardId: string) {
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

export async function updateCardPosition(
  cardId: string,
  columnId: string,
  position: number
) {
  const { error } = await supabase
    .from('cards')
    .update({ column_id: columnId, position })
    .eq('id', cardId)

  if (error) throw error
}

export async function updateManyCardPositions(
  updates: { id: string; column_id: string; position: number }[]
) {
  const promises = updates.map((u) =>
    supabase
      .from('cards')
      .update({ column_id: u.column_id, position: u.position })
      .eq('id', u.id)
  )
  await Promise.all(promises)
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

export async function updateCardTitle(cardId: string, title: string) {
  const { error } = await supabase.from('cards').update({ title }).eq('id', cardId)
  if (error) throw error
}

export async function updateColumnTitle(columnId: string, title: string) {
  const { error } = await supabase.from('columns').update({ title }).eq('id', columnId)
  if (error) throw error
}
export async function updateCardDescription(cardId: string, description: string) {
  const { error } = await supabase
    .from('cards')
    .update({ description })
    .eq('id', cardId)
  if (error) throw error
}