'use client'

import { useEffect } from 'react'
import { supabase } from './client'
import { useBoardStore } from '@/store/boardStore'
import type { Card, Column } from './queries'

export function useRealtimeBoard(boardId: string) {
  const cards = useBoardStore((s) => s.cards)
  const columns = useBoardStore((s) => s.columns)
  const setCards = useBoardStore((s) => s.setCards)
  const setColumns = useBoardStore((s) => s.setColumns)

  useEffect(() => {
    const channel = supabase
      .channel(`board-${boardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards' },
        (payload) => {
          const state = useBoardStore.getState()

          if (payload.eventType === 'INSERT') {
            const newCard = payload.new as Card
            const exists = state.cards.some((c) => c.id === newCard.id)
            if (!exists) setCards([...state.cards, newCard])
          }

          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Card
            setCards(
              state.cards.map((c) => (c.id === updated.id ? updated : c))
            )
          }

          if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id as string
            setCards(state.cards.filter((c) => c.id !== deletedId))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'columns', filter: `board_id=eq.${boardId}` },
        (payload) => {
          const state = useBoardStore.getState()

          if (payload.eventType === 'INSERT') {
            const newColumn = payload.new as Column
            const exists = state.columns.some((c) => c.id === newColumn.id)
            if (!exists) setColumns([...state.columns, newColumn])
          }

          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Column
            setColumns(
              state.columns.map((c) => (c.id === updated.id ? updated : c))
            )
          }

          if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id as string
            setColumns(state.columns.filter((c) => c.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [boardId])
}