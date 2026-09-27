'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { normalizeError } from '@/lib/errors/normalizeError'
import { sortByPosition } from '@/lib/board/layout'
import type { Card, Column } from '@/lib/board/types'
import { queryKeys } from '@/lib/queries/keys'
import { getBoardData } from '@/lib/supabase/queries'

const EMPTY_CARDS: Card[] = []
const EMPTY_COLUMNS: Column[] = []

/**
 * تنها منبع Server State بورد.
 * داده از Query Cache خوانده می‌شود (نه از state محلی) و
 * ترتیب ستون‌ها به‌عنوان داده‌ی مشتق memo می‌شود، نه به‌عنوان state.
 * خطا هم به‌شکل AppError برگردانده می‌شود تا UI پیام فارسی درست نشان دهد.
 */
export function useBoard(boardId: string) {
  const query = useQuery({
    queryKey: queryKeys.board(boardId),
    queryFn: () => getBoardData(boardId),
  })

  const columns = query.data?.columns
  const cards = query.data?.cards

  const sortedColumns = useMemo(
    () => (columns ? sortByPosition(columns) : EMPTY_COLUMNS),
    [columns]
  )

  return {
    isPending: query.isPending,
    error: query.error ? normalizeError(query.error) : null,
    refetch: query.refetch,
    cards: cards ?? EMPTY_CARDS,
    sortedColumns,
  }
}
