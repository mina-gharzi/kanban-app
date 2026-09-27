'use client'

import { useCallback, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyColumnPositions } from '@/lib/board/layout'
import {
  createOptimisticColumn,
  insertCardsAt,
  insertColumnAt,
  nextColumnPosition,
  removeColumnAt,
  replaceTemporaryColumn,
  restoreColumnPositions,
  snapshotColumnMove,
  type ColumnMoveSnapshot,
  type RemovedColumn,
} from '@/lib/board/optimistic'
import { reportError } from '@/lib/errors/reportError'
import type {
  BoardData,
  Column,
  ColumnPositionUpdate,
} from '@/lib/board/types'
import { queryKeys } from '@/lib/queries/keys'
import {
  pendingCreateKey,
  runSerialized,
  trackOptimisticWrites,
} from '@/lib/queries/mutationQueue'
import {
  addColumn,
  deleteColumn,
  updateColumnTitle,
  updateColumnPositions,
} from '@/lib/supabase/queries'

type CreateColumnContext = {
  temporaryId: string
  releaseTracking: () => void
} | null

type RenameColumnContext = {
  previousTitle: string
  releaseTracking: () => void
} | null
type DeleteColumnContext = {
  removed: RemovedColumn
  releaseTracking: () => void
} | null
type MoveColumnContext = {
  snapshot: ColumnMoveSnapshot
  releaseTracking: () => void
} | null

/**
 * Mutationهای ستون روی همان Query Cache بورد کار می‌کنند.
 *
 * حذف ستون، کارت‌های آن را هم از کش برمی‌دارد؛ rollback باید ستون **و**
 * همه‌ی کارت‌هایش را با جای قبلی برگرداند، وگرنه بورد ناقص می‌ماند.
 */
export function useColumnMutations(boardId: string) {
  const queryClient = useQueryClient()
  const boardKey = queryKeys.board(boardId)

  const writeBoard = (updater: (previous: BoardData) => BoardData): void => {
    queryClient.setQueryData<BoardData>(boardKey, (previous) =>
      previous ? updater(previous) : previous
    )
  }

  const createColumnMutation = useMutation<
    Column,
    unknown,
    { title: string; position: number },
    CreateColumnContext
  >({
    mutationFn: ({ title, position }: { title: string; position: number }) =>
      addColumn(boardId, title, position),
    onMutate: async ({ title, position }) => {
      await queryClient.cancelQueries({ queryKey: boardKey })
      const previous = queryClient.getQueryData<BoardData>(boardKey)
      if (!previous) return null

      const optimisticColumn = createOptimisticColumn({ boardId, title, position })
      writeBoard((data) => ({
        ...data,
        columns: [...data.columns, optimisticColumn],
      }))

      return {
        temporaryId: optimisticColumn.id,
        // رویداد INSERT ستون، شناسه‌ی واقعی را دارد نه شناسه‌ی موقت ما؛ پس
        // ردیابی روی خود بورد انجام می‌شود (ستون تازه متعلق به همین بورد است)
        releaseTracking: trackOptimisticWrites(boardId, [
          pendingCreateKey('column', boardId),
        ]),
      }
    },
    onSuccess: (newColumn, _variables, context) => {
      if (!context) return
      writeBoard((data) => ({
        ...data,
        columns: replaceTemporaryColumn(data.columns, context.temporaryId, newColumn),
      }))
    },
    onError: (error, _variables, context) => {
      if (context) {
        writeBoard((data) => ({
          ...data,
          columns: data.columns.filter(
            (column) => column.id !== context.temporaryId
          ),
        }))
      }
      reportError(error, 'column.create')
    },
    onSettled: (_data, _error, _variables, context) => {
      context?.releaseTracking()
      queryClient.invalidateQueries({ queryKey: boardKey })
    },
  })

  const updateTitleMutation = useMutation<
    void,
    unknown,
    { columnId: string; title: string },
    RenameColumnContext
  >({
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
      const target = previous?.columns.find((column) => column.id === columnId)
      if (!previous || !target) return null

      const previousTitle = target.title
      writeBoard((data) => ({
        ...data,
        columns: data.columns.map((column) =>
          column.id === columnId ? { ...column, title } : column
        ),
      }))
      return {
        previousTitle,
        // تغییر عنوان هم نوشتن خوش‌بینانه است و تا تأیید سرور، مالک رکورد است
        releaseTracking: trackOptimisticWrites(boardId, [columnId]),
      }
    },
    onError: (error, variables, context) => {
      // اگر کاربر بعداً عنوان دیگری ثبت کرده باشد، همان حفظ می‌شود
      if (context) {
        const current = queryClient.getQueryData<BoardData>(boardKey)
        const target = current?.columns.find(
          (column) => column.id === variables.columnId
        )
        if (target?.title === variables.title) {
          writeBoard((data) => ({
            ...data,
            columns: data.columns.map((column) =>
              column.id === variables.columnId
                ? { ...column, title: context.previousTitle }
                : column
            ),
          }))
        }
      }
      reportError(error, 'column.update')
    },
    onSettled: (_data, _error, _variables, context) => {
      context?.releaseTracking()
      queryClient.invalidateQueries({ queryKey: boardKey })
    },
  })

  const removeColumnMutation = useMutation<
    void,
    unknown,
    string,
    DeleteColumnContext
  >({
    mutationFn: (columnId: string) => deleteColumn(columnId),
    onMutate: async (columnId) => {
      await queryClient.cancelQueries({ queryKey: boardKey })
      const previous = queryClient.getQueryData<BoardData>(boardKey)
      if (!previous) return null

      const { data, removed } = removeColumnAt(previous, columnId)
      if (!removed) return null
      writeBoard(() => data)

      return {
        removed,
        releaseTracking: trackOptimisticWrites(boardId, [
          columnId,
          ...removed.cards.map((item) => item.card.id),
        ]),
      }
    },
    onError: (error, _columnId, context) => {
      // ستون و تمام کارت‌هایش با همان ترتیب قبلی برمی‌گردند
      if (context) {
        writeBoard((data) => ({
          columns: insertColumnAt(data.columns, context.removed),
          cards: insertCardsAt(data.cards, context.removed.cards),
        }))
      }
      reportError(error, 'column.delete')
    },
    onSettled: (_data, _error, _columnId, context) => {
      context?.releaseTracking()
      queryClient.invalidateQueries({ queryKey: boardKey })
    },
  })

  const moveColumnMutation = useMutation<
    void,
    unknown,
    ColumnPositionUpdate[],
    MoveColumnContext
  >({
    mutationFn: (updates: ColumnPositionUpdate[]) =>
      runSerialized(boardId, () => updateColumnPositions(updates)),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: boardKey })
      const previous = queryClient.getQueryData<BoardData>(boardKey)
      if (!previous || updates.length === 0) return null

      const snapshot = snapshotColumnMove(previous.columns, updates)
      writeBoard((data) => ({
        ...data,
        columns: applyColumnPositions(data.columns, updates),
      }))

      return {
        snapshot,
        releaseTracking: trackOptimisticWrites(
          boardId,
          updates.map((update) => update.id)
        ),
      }
    },
    onError: (error, _updates, context) => {
      if (context) {
        writeBoard((data) => ({
          ...data,
          columns: restoreColumnPositions(data.columns, context.snapshot),
        }))
      }
      reportError(error, 'column.move')
    },
    onSettled: (_data, _error, _updates, context) => {
      context?.releaseTracking()
      queryClient.invalidateQueries({ queryKey: boardKey })
    },
  })

  const { mutate: mutateCreateColumn } = createColumnMutation
  const { mutate: mutateUpdateColumnTitle } = updateTitleMutation
  const { mutate: mutateDeleteColumn } = removeColumnMutation
  const { mutate: mutateMoveColumn } = moveColumnMutation

  const createColumn = useCallback(
    (title: string) => {
      const data = queryClient.getQueryData<BoardData>(boardKey)
      mutateCreateColumn({
        title,
        position: nextColumnPosition(data?.columns ?? []),
      })
    },
    [boardKey, mutateCreateColumn, queryClient]
  )

  // mutate های useMutation پایدار (useCallback) هستند؛ نام متغیرها عمداً
  // با نام‌های public متفاوت است تا تابع‌های لایه‌ی data-access را نپوشاند
  return useMemo(
    () => ({
      createColumn,
      updateColumnTitle: mutateUpdateColumnTitle,
      deleteColumn: mutateDeleteColumn,
      moveColumn: mutateMoveColumn,
    }),
    [
      createColumn,
      mutateUpdateColumnTitle,
      mutateDeleteColumn,
      mutateMoveColumn,
    ]
  )
}

export type ColumnMutations = ReturnType<typeof useColumnMutations>
