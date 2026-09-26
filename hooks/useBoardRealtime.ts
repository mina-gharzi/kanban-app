'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { BoardData, Card, Column } from '@/lib/board/types'
import { queryKeys } from '@/lib/queries/keys'
import { supabase } from '@/lib/supabase/client'

/**
 * Realtime دیگر منبع دوم موازی نیست: هر event فقط Query Cache بورد را
 * به‌روز می‌کند و همان یک منبع، داده‌ی UI را می‌سازد.
 * ستون‌ها با filter برد محدود شده‌اند و کارت‌ها از طریق ستون‌های همین بورد
 * اعتبارسنجی می‌شوند تا رویداد بورد دیگر cache این بورد را تغییر ندهد.
 */
export function useBoardRealtime(boardId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!boardId) return

    const boardKey = queryKeys.board(boardId)
    const setBoardData = (
      updater: (previous: BoardData) => BoardData
    ): void => {
      queryClient.setQueryData<BoardData>(boardKey, (previous) =>
        previous ? updater(previous) : previous
      )
    }

    const channel = supabase
      .channel(`board-${boardId}`)
      .on<Card>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCard = payload.new
            setBoardData((previous) => {
              const belongsToBoard = previous.columns.some(
                (column) => column.id === newCard.column_id
              )
              const alreadyKnown = previous.cards.some(
                (card) => card.id === newCard.id
              )
              if (!belongsToBoard || alreadyKnown) return previous
              return { ...previous, cards: [...previous.cards, newCard] }
            })
          }

          if (payload.eventType === 'UPDATE') {
            const updatedCard = payload.new
            setBoardData((previous) => {
              const belongsToBoard = previous.columns.some(
                (column) => column.id === updatedCard.column_id
              )
              if (!belongsToBoard) return previous
              return {
                ...previous,
                cards: previous.cards.map((card) =>
                  card.id === updatedCard.id ? updatedCard : card
                ),
              }
            })
          }

          if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id
            if (!deletedId) return
            setBoardData((previous) => ({
              ...previous,
              cards: previous.cards.filter((card) => card.id !== deletedId),
            }))
          }
        }
      )
      .on<Column>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'columns',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newColumn = payload.new
            setBoardData((previous) => {
              const alreadyKnown = previous.columns.some(
                (column) => column.id === newColumn.id
              )
              if (alreadyKnown) return previous
              return { ...previous, columns: [...previous.columns, newColumn] }
            })
          }

          if (payload.eventType === 'UPDATE') {
            const updatedColumn = payload.new
            setBoardData((previous) => ({
              ...previous,
              columns: previous.columns.map((column) =>
                column.id === updatedColumn.id ? updatedColumn : column
              ),
            }))
          }

          if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id
            if (!deletedId) return
            setBoardData((previous) => ({
              ...previous,
              columns: previous.columns.filter(
                (column) => column.id !== deletedId
              ),
            }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [boardId, queryClient])
}
