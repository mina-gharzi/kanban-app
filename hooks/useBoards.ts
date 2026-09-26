'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Board } from '@/lib/board/types'
import { notifyError } from '@/lib/notifications'
import { queryKeys } from '@/lib/queries/keys'
import { createBoard, deleteBoard, getBoards } from '@/lib/supabase/queries'

/** لیست بوردهای کاربر (Server State). */
export function useBoards() {
  return useQuery({
    queryKey: queryKeys.boards,
    queryFn: getBoards,
  })
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
    onError: (error) => notifyError('ساخت بورد با مشکل مواجه شد.', error),
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
      notifyError('حذف بورد با مشکل مواجه شد.', error)
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
