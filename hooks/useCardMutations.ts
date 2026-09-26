'use client'

import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyCardPositions } from '@/lib/board/layout'
import type {
  BoardData,
  CardFieldPatch,
  CardPositionUpdate,
} from '@/lib/board/types'
import { notifyError } from '@/lib/notifications'
import { queryKeys } from '@/lib/queries/keys'
import { addCard, deleteCard, updateCard, updateManyCardPositions } from '@/lib/supabase/queries'

const FIELD_LABELS: Record<keyof CardFieldPatch, string> = {
  title: 'عنوان کارت',
  description: 'توضیحات',
  label_color: 'لیبل',
  due_date: 'تاریخ سررسید',
}

function fieldLabel(patch: CardFieldPatch): string {
  const field = Object.keys(patch)[0] as keyof CardFieldPatch | undefined
  return field ? FIELD_LABELS[field] : 'کارت'
}

function nextPositionInColumn(
  data: BoardData | undefined,
  columnId: string
): number {
  if (!data) return 0
  return data.cards.filter((card) => card.column_id === columnId).length
}

/**
 * Mutationهای کارت روی Query Cache بورد کار می‌کنند:
 * ساخت از پاسخ سرور کش می‌شود و بقیه به‌صورت optimistic
 * (onMutate → snapshot → update cache) اعمال می‌شوند و در خطا rollback می‌گردند.
 */
export function useCardMutations(boardId: string) {
  const queryClient = useQueryClient()
  const boardKey = queryKeys.board(boardId)

  const createCardMutation = useMutation({
    mutationFn: ({ columnId, title }: { columnId: string; title: string }) => {
      const data = queryClient.getQueryData<BoardData>(boardKey)
      return addCard(columnId, title, nextPositionInColumn(data, columnId))
    },
    onSuccess: (newCard) => {
      queryClient.setQueryData<BoardData>(boardKey, (previous) =>
        previous
          ? { ...previous, cards: [...previous.cards, newCard] }
          : previous
      )
    },
    onError: (error) => notifyError('افزودن کارت با مشکل مواجه شد.', error),
    onSettled: () => queryClient.invalidateQueries({ queryKey: boardKey }),
  })

  const updateCardMutation = useMutation({
    mutationFn: ({
      cardId,
      patch,
    }: {
      cardId: string
      patch: CardFieldPatch
    }) => updateCard(cardId, patch),
    onMutate: async ({ cardId, patch }) => {
      await queryClient.cancelQueries({ queryKey: boardKey })
      const previous = queryClient.getQueryData<BoardData>(boardKey)
      queryClient.setQueryData<BoardData>(boardKey, (data) =>
        data
          ? {
              ...data,
              cards: data.cards.map((card) =>
                card.id === cardId ? { ...card, ...patch } : card
              ),
            }
          : data
      )
      return { previous }
    },
    onError: (error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKey, context.previous)
      }
      notifyError(`آپدیت ${fieldLabel(variables.patch)} با مشکل مواجه شد.`, error)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: boardKey }),
  })

  const removeCard = useMutation({
    mutationFn: (cardId: string) => deleteCard(cardId),
    onMutate: async (cardId) => {
      await queryClient.cancelQueries({ queryKey: boardKey })
      const previous = queryClient.getQueryData<BoardData>(boardKey)
      queryClient.setQueryData<BoardData>(boardKey, (data) =>
        data
          ? { ...data, cards: data.cards.filter((card) => card.id !== cardId) }
          : data
      )
      return { previous }
    },
    onError: (error, _cardId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKey, context.previous)
      }
      notifyError('حذف کارت با مشکل مواجه شد.', error)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: boardKey }),
  })

  // ورودی این mutation از قبل توسط لایه‌ی Drag & Drop محاسبه شده است
  const moveCardMutation = useMutation({
    mutationFn: (updates: CardPositionUpdate[]) => updateManyCardPositions(updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: boardKey })
      const previous = queryClient.getQueryData<BoardData>(boardKey)
      queryClient.setQueryData<BoardData>(boardKey, (data) =>
        data
          ? { ...data, cards: applyCardPositions(data.cards, updates) }
          : data
      )
      return { previous }
    },
    onError: (error, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKey, context.previous)
      }
      notifyError('جابجایی کارت با مشکل مواجه شد.', error)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: boardKey }),
  })

  // mutate های useMutation پایدار (useCallback) هستند؛ نام متغیرها عمداً
  // با نام‌های public متفاوت است تا تابع‌های لایه‌ی data-access را نپوشاند
  const { mutate: mutateCreateCard } = createCardMutation
  const { mutate: mutateUpdateCard } = updateCardMutation
  const { mutate: mutateDeleteCard } = removeCard
  const { mutate: mutateMoveCard } = moveCardMutation

  return useMemo(
    () => ({
      createCard: mutateCreateCard,
      updateCard: mutateUpdateCard,
      deleteCard: mutateDeleteCard,
      moveCard: mutateMoveCard,
    }),
    [mutateCreateCard, mutateUpdateCard, mutateDeleteCard, mutateMoveCard]
  )
}

export type CardMutations = ReturnType<typeof useCardMutations>
