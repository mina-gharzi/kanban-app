'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'
import { AppError } from '@/lib/errors/AppError'
import { ERROR_CODES } from '@/lib/errors/errorCodes'
import { logError } from '@/lib/errors/logError'
import type { BoardData, Card, Column } from '@/lib/board/types'
import { queryKeys } from '@/lib/queries/keys'
import { hasOptimisticWrite, pendingCreateKey } from '@/lib/queries/mutationQueue'
import { supabase } from '@/lib/supabase/client'

/** وضعیت اتصال realtime که UI به آن واکنش نشان می‌دهد. */
export type RealtimeStatus = 'connecting' | 'live' | 'error'

function toStatus(state: REALTIME_SUBSCRIBE_STATES): RealtimeStatus {
  if (state === 'SUBSCRIBED') return 'live'
  if (state === 'TIMED_OUT' || state === 'CHANNEL_ERROR' || state === 'CLOSED') {
    return 'error'
  }
  return 'connecting'
}

/**
 * Realtime دومین منبع موازی نیست: هر رویداد فقط Query Cache بورد را
 * به‌روز می‌کند و همان یک منبع، داده‌ی UI را می‌سازد.
 *
 * هماهنگی با Optimistic Update — سه قاعده:
 *
 * ۱) تا وقتی یک نوشتن خوش‌بینانه روی رکوردی در جریان است، رویداد realtime
 *    همان رکورد نادیده گرفته می‌شود. بدون این قاعده، مقدار کهنه‌ی سرور
 *    پیش‌بینی ما را بازنویسی می‌کند و UI به عقب می‌پرد.
 *    همگام‌سازی نهایی را `invalidateQueries` در `onSettled` انجام می‌دهد.
 *
 * ۲) INSERT کارتی که همین حالا در حال ساخت است نادیده گرفته می‌شود تا کارت
 *    موقت و کارت واقعی دوبار در کش ننشینند؛ جایگزینی با پاسخ سرور کارِ
 *    خودِ mutation است.
 *
 * ۳) کارت‌های این بورد از طریق ستون‌های همین بورد اعتبارسنجی می‌شوند تا
 *    رویداد بورد دیگر cache این بورد را تغییر ندهد.
 */
export function useBoardRealtime(boardId: string): RealtimeStatus {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<RealtimeStatus>('connecting')
  const lastStatusRef = useRef<RealtimeStatus>('connecting')

  useEffect(() => {
    if (!boardId) return

    const boardKey = queryKeys.board(boardId)
    const setBoardData = (updater: (previous: BoardData) => BoardData): void => {
      queryClient.setQueryData<BoardData>(boardKey, (previous) =>
        previous ? updater(previous) : previous
      )
    }
    const writeInFlight = (ids: readonly string[]): boolean =>
      hasOptimisticWrite(boardId, ids)

    const updateStatus = (next: RealtimeStatus, channelState: string) => {
      if (next === lastStatusRef.current) return
      lastStatusRef.current = next
      if (next === 'error') {
        logError(
          new AppError({
            code: ERROR_CODES.NETWORK,
            message: `realtime channel "${channelState}"`,
          }),
          'board.realtime'
        )
      }
      setStatus(next)
    }

    const channel: RealtimeChannel = supabase
      .channel(`board-${boardId}`)
      .on<Card>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCard = payload.new
            // قاعده ۲: create در جریان، خودش رکورد را جایگزین می‌کند
            if (writeInFlight([pendingCreateKey('card', newCard.column_id)])) return
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
            // قاعده ۱: نوشتن خوش‌بینانه در جریان، مالک این رکورد است
            if (writeInFlight([updatedCard.id])) return
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
            if (writeInFlight([deletedId])) return
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
            // قاعده ۲: create ستون در جریان، خودش رکورد را جایگزین می‌کند.
            // کلید روی بورد است چون INSERT شناسه‌ی واقعی ستون را دارد، نه
            // شناسه‌ی موقتی که ما ساخته‌ایم.
            if (writeInFlight([pendingCreateKey('column', boardId)])) return
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
            if (writeInFlight([updatedColumn.id])) return
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
            if (writeInFlight([deletedId])) return
            setBoardData((previous) => ({
              ...previous,
              columns: previous.columns.filter(
                (column) => column.id !== deletedId
              ),
            }))
          }
        }
      )
      .subscribe((channelState) => {
        updateStatus(toStatus(channelState), channelState)
      })

    return () => {
      lastStatusRef.current = 'connecting'
      void supabase.removeChannel(channel)
    }
  }, [boardId, queryClient])

  return status
}
