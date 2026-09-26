'use client'

import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyColumnPositions } from '@/lib/board/layout'
import type { BoardData, ColumnPositionUpdate } from '@/lib/board/types'
import { notifyError } from '@/lib/notifications'
import { queryKeys } from '@/lib/queries/keys'
import {
  addColumn,
  deleteColumn,
  updateColumnTitle,
  updateColumnPositions,
} from '@/lib/supabase/queries'

/**
 * Mutationهای ستون روی Query Cache بورد کار می‌کنند.
 * حذف ستون، کارت‌های همان ستون را هم از کش پاک می‌کند.
 */
export function useColumnMutations(boardId: string) {
  const queryClient = useQueryClient()
  const boardKey = queryKeys.board(boardId)

  const createColumnMutation = useMutation({
    mutationFn: (title: string) => {
      const data = queryClient.getQueryData<BoardData>(boardKey)
      return addColumn(boardId, title, data?.columns.length ?? 0)
    },
    onSuccess: (newColumn) => {
      queryClient.setQueryData<BoardData>(boardKey, (previous) =>
        previous
          ? { ...previous, columns: [...previous.columns, newColumn] }
          : previous
      )
    },
    onError: (error) => notifyError('افزودن ستون با مشکل مواجه شد.', error),
    onSettled: () => queryClient.invalidateQueries({ queryKey: boardKey }),
  })

  const updateTitleMutation = useMutation({
    mutationFn: ({
      columnId,
      title,
    }: {
      columnId: string
      title: string
    }) => updateColumnTitle(columnId, title),
    onMutate: async ({ columnId, title }) => {
      await queryClient.cancelQueries({ queryKey: boardKey })
      const previous = queryClient.getQueryData<BoardData>(boardKey)
      queryClient.setQueryData<BoardData>(boardKey, (data) =>
        data
          ? {
              ...data,
              columns: data.columns.map((column) =>
                column.id === columnId ? { ...column, title } : column
              ),
            }
          : data
      )
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKey, context.previous)
      }
      notifyError('آپدیت عنوان ستون با مشکل مواجه شد.', error)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: boardKey }),
  })

  const removeColumnMutation = useMutation({
    mutationFn: (columnId: string) => deleteColumn(columnId),
    onMutate: async (columnId) => {
      await queryClient.cancelQueries({ queryKey: boardKey })
      const previous = queryClient.getQueryData<BoardData>(boardKey)
      queryClient.setQueryData<BoardData>(boardKey, (data) =>
        data
          ? {
              columns: data.columns.filter((column) => column.id !== columnId),
              cards: data.cards.filter((card) => card.column_id !== columnId),
            }
          : data
      )
      return { previous }
    },
    onError: (error, _columnId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKey, context.previous)
      }
      notifyError('حذف ستون با مشکل مواجه شد.', error)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: boardKey }),
  })

  // ورودی این mutation از قبل توسط لایه‌ی Drag & Drop محاسبه شده است
  const moveColumnMutation = useMutation({
    mutationFn: (updates: ColumnPositionUpdate[]) => updateColumnPositions(updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: boardKey })
      const previous = queryClient.getQueryData<BoardData>(boardKey)
      queryClient.setQueryData<BoardData>(boardKey, (data) =>
        data
          ? { ...data, columns: applyColumnPositions(data.columns, updates) }
          : data
      )
      return { previous }
    },
    onError: (error, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKey, context.previous)
      }
      notifyError('جابجایی ستون با مشکل مواجه شد.', error)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: boardKey }),
  })

  // mutate های useMutation پایدار (useCallback) هستند؛ نام متغیرها عمداً
  // با نام‌های public متفاوت است تا تابع‌های لایه‌ی data-access را نپوشاند
  const { mutate: mutateCreateColumn } = createColumnMutation
  const { mutate: mutateUpdateColumnTitle } = updateTitleMutation
  const { mutate: mutateDeleteColumn } = removeColumnMutation
  const { mutate: mutateMoveColumn } = moveColumnMutation

  return useMemo(
    () => ({
      createColumn: mutateCreateColumn,
      updateColumnTitle: mutateUpdateColumnTitle,
      deleteColumn: mutateDeleteColumn,
      moveColumn: mutateMoveColumn,
    }),
    [
      mutateCreateColumn,
      mutateUpdateColumnTitle,
      mutateDeleteColumn,
      mutateMoveColumn,
    ]
  )
}

export type ColumnMutations = ReturnType<typeof useColumnMutations>
