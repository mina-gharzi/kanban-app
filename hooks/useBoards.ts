'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportError } from '@/lib/errors/reportError'
import type { Board } from '@/lib/board/types'
import { normalizeError } from '@/lib/errors/normalizeError'
import { queryKeys } from '@/lib/queries/keys'
import { createBoard, deleteBoard, getBoards } from '@/lib/supabase/queries'

const EMPTY_BOARDS: Board[] = []

/** لیست بوردهای کاربر (Server State). */
export function useBoards() {
  const query = useQuery({
    queryKey: queryKeys.boards,
    queryFn: getBoards,
  })

  return {
    boards: query.data ?? EMPTY_BOARDS,
    isPending: query.isPending,
    error: query.error ? normalizeError(query.error) : null,
    refetch: query.refetch,
  }
}

export function useBoardMutations() {
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: (title: string) => createBoard(title),
    onSuccess: (board) => {
      queryClient.setQueryData<Board[]>(queryKeys.boards, (previous) => [
        board,
        ...(previous ?? []),
      ])
    },
    onError: (error) => reportError(error, 'board.create'),
  })

  const remove = useMutation({
    mutationFn: (boardId: string) => deleteBoard(boardId),
    onMutate: async (boardId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boards })
      const previous = queryClient.getQueryData<Board[]>(queryKeys.boards)
      queryClient.setQueryData<Board[]>(queryKeys.boards, (prev) =>
        prev?.filter((board) => board.id !== boardId)
      )
      return { previous }
    },
    onError: (error, _boardId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.boards, context.previous)
      }
      reportError(error, 'board.delete')
    },
    onSettled: (_data, _error, boardId) => {
      queryClient.removeQueries({ queryKey: queryKeys.board(boardId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.boards })
    },
  })

  return {
    createBoard: create.mutate,
    deleteBoard: remove.mutate,
  }
}
