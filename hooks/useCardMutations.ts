'use client'

import { useCallback, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyCardPositions } from '@/lib/board/layout'
import {
  createOptimisticCard,
  insertCardAt,
  nextCardPosition,
  removeCardAt,
  replaceTemporaryCard,
  restoreCardFields,
  restoreCardPositions,
  snapshotCardFields,
  snapshotCardMove,
  type CardFieldSnapshot,
  type CardMoveSnapshot,
  type RemovedCard,
} from '@/lib/board/optimistic'
import { reportError } from '@/lib/errors/reportError'
import type {
  BoardData,
  Card,
  CardFieldPatch,
  CardPositionUpdate,
} from '@/lib/board/types'
import { queryKeys } from '@/lib/queries/keys'
import {
  pendingCreateKey,
  runSerialized,
  trackOptimisticWrites,
} from '@/lib/queries/mutationQueue'
import {
  addCard,
  deleteCard,
  updateCard,
  updateManyCardPositions,
} from '@/lib/supabase/queries'

/** متغیرهای create: position در لحظه‌ی کاربر و از آخرین کش تعیین می‌شود. */
type CreateCardVariables = {
  columnId: string
  title: string
  position: number
}

type CreateCardContext = {
  temporaryId: string
  releaseTracking: () => void
} | null

type UpdateCardContext = {
  snapshot: CardFieldSnapshot
  releaseTracking: () => void
} | null
type DeleteCardContext = { removed: RemovedCard; releaseTracking: () => void } | null
type MoveCardContext = {
  snapshot: CardMoveSnapshot
  releaseTracking: () => void
} | null

/**
 * همه‌ی mutationهای کارت روی یک منبع حقیقت کار می‌کنند: Query Cache بورد.
 *
 * الگوی مشترک هر mutation:
 *   onMutate → snapshot محدود به همان رکوردها → نوشتن در کش (بلافاصله)
 *   onError  → برگرداندن دقیق همان مقدارها + یک پیام از reportError
 *   onSettled→ آزادسازی ردیابی + invalidate برای همگام‌سازی با سرور
 *
 * snapshot عمداً کل بورد نیست: اگر دو mutation هم‌زمان در جریان باشند،
 * rollback یکی نباید تغییر موفق دیگری را پاک کند.
 */
export function useCardMutations(boardId: string) {
  const queryClient = useQueryClient()
  const boardKey = queryKeys.board(boardId)

  const writeBoard = (
    updater: (previous: BoardData) => BoardData
  ): void => {
    queryClient.setQueryData<BoardData>(boardKey, (previous) =>
      previous ? updater(previous) : previous
    )
  }

  const createCardMutation = useMutation<
    Card,
    unknown,
    CreateCardVariables,
    CreateCardContext
  >({
    mutationFn: ({ columnId, title, position }: CreateCardVariables) =>
      addCard(columnId, title, position),
    onMutate: async ({ columnId, title, position }: CreateCardVariables) => {
      await queryClient.cancelQueries({ queryKey: boardKey })
      const previous = queryClient.getQueryData<BoardData>(boardKey)
      if (!previous) return null

      const optimisticCard = createOptimisticCard({
        columnId,
        title,
        position,
      })
      writeBoard((data) => ({
        ...data,
        cards: [...data.cards, optimisticCard],
      }))

      return {
        temporaryId: optimisticCard.id,
        // تا وقتی این create در جریان است، realtime نباید کارت را دوباره اضافه کند
        releaseTracking: trackOptimisticWrites(boardId, [
          pendingCreateKey('card', columnId),
        ]),
      }
    },
    onSuccess: (newCard, _variables, context) => {
      if (!context) return
      // رکورد موقت با پاسخ سرور جایگزین می‌شود؛ طول آرایه ثابت می‌ماند
      writeBoard((data) => ({
        ...data,
        cards: replaceTemporaryCard(data.cards, context.temporaryId, newCard),
      }))
    },
    onError: (error, _variables, context) => {
      if (context) {
        writeBoard((data) => ({
          ...data,
          cards: data.cards.filter((card) => card.id !== context.temporaryId),
        }))
      }
      reportError(error, 'card.create')
    },
    onSettled: (_data, _error, _variables, context) => {
      context?.releaseTracking()
      queryClient.invalidateQueries({ queryKey: boardKey })
    },
  })

  const updateCardMutation = useMutation<
    void,
    unknown,
    { cardId: string; patch: CardFieldPatch },
    UpdateCardContext
  >({
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
      const target = previous?.cards.find((card) => card.id === cardId)
      if (!previous || !target) return null

      const snapshot = snapshotCardFields(target, patch)
      writeBoard((data) => ({
        ...data,
        cards: data.cards.map((card) =>
          card.id === cardId ? { ...card, ...patch } : card
        ),
      }))
      return {
        snapshot,
        // ویرایش فیلد هم یک نوشتن خوش‌بینانه است: تا قبل از تأیید سرور،
        // realtime نباید مقدار کهنه‌ی همان کارت را روی این patch بگذارد
        releaseTracking: trackOptimisticWrites(boardId, [cardId]),
      }
    },
    onError: (error, _variables, context) => {
      if (context) {
        writeBoard((data) => ({
          ...data,
          cards: restoreCardFields(data.cards, context.snapshot),
        }))
      }
      reportError(error, 'card.update')
    },
    onSettled: (_data, _error, _variables, context) => {
      context?.releaseTracking()
      queryClient.invalidateQueries({ queryKey: boardKey })
    },
  })

  const removeCardMutation = useMutation<
    void,
    unknown,
    string,
    DeleteCardContext
  >({
    mutationFn: (cardId: string) => deleteCard(cardId),
    onMutate: async (cardId) => {
      await queryClient.cancelQueries({ queryKey: boardKey })
      const previous = queryClient.getQueryData<BoardData>(boardKey)
      if (!previous) return null

      const { cards, removed } = removeCardAt(previous.cards, cardId)
      if (!removed) return null
      writeBoard((data) => ({ ...data, cards }))

      return {
        removed,
        releaseTracking: trackOptimisticWrites(boardId, [cardId]),
      }
    },
    onError: (error, _cardId, context) => {
      // کارت دقیقاً به همان اندیس قبلی برمی‌گردد
      if (context) {
        writeBoard((data) => ({
          ...data,
          cards: insertCardAt(data.cards, context.removed),
        }))
      }
      reportError(error, 'card.delete')
    },
    onSettled: (_data, _error, _cardId, context) => {
      context?.releaseTracking()
      queryClient.invalidateQueries({ queryKey: boardKey })
    },
  })

  const moveCardMutation = useMutation<
    void,
    unknown,
    CardPositionUpdate[],
    MoveCardContext
  >({
    mutationFn: (updates: CardPositionUpdate[]) =>
      // دو Drag پشت سر هم نباید هم‌زمان به سرور برسند، وگرنه ترتیب جابه‌جایی
      // می‌تواند برعکس ثبت شود
      runSerialized(boardId, () => updateManyCardPositions(updates)),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: boardKey })
      const previous = queryClient.getQueryData<BoardData>(boardKey)
      if (!previous || updates.length === 0) return null

      const snapshot = snapshotCardMove(previous.cards, updates)
      writeBoard((data) => ({
        ...data,
        cards: applyCardPositions(data.cards, updates),
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
      // فقط همان کارت‌هایی برمی‌گردند که هنوز مقدار خوش‌بینانه‌ی ما را دارند
      if (context) {
        writeBoard((data) => ({
          ...data,
          cards: restoreCardPositions(data.cards, context.snapshot),
        }))
      }
      reportError(error, 'card.move')
    },
    onSettled: (_data, _error, _updates, context) => {
      context?.releaseTracking()
      queryClient.invalidateQueries({ queryKey: boardKey })
    },
  })

  const { mutate: mutateCreateCard } = createCardMutation
  const { mutate: mutateUpdateCard } = updateCardMutation
  const { mutate: mutateDeleteCard } = removeCardMutation
  const { mutate: mutateMoveCard } = moveCardMutation

  /**
   * جای کارت جدید یک‌بار و از آخرین کش تعیین می‌شود و همان مقدار هم برای
   * نمایش خوش‌بینانه و هم برای درج در سرور استفاده می‌شود؛ وگرنه کارت
   * موقت و کارت واقعی دو position متفاوت می‌گیرند.
   */
  const createCard = useCallback(
    ({ columnId, title }: { columnId: string; title: string }) => {
      const data = queryClient.getQueryData<BoardData>(boardKey)
      mutateCreateCard({
        columnId,
        title,
        position: nextCardPosition(data?.cards ?? [], columnId),
      })
    },
    [boardKey, mutateCreateCard, queryClient]
  )

  // mutate های useMutation پایدار (useCallback) هستند؛ نام متغیرها عمداً
  // با نام‌های public متفاوت است تا تابع‌های لایه‌ی data-access را نپوشاند
  return useMemo(
    () => ({
      createCard,
      updateCard: mutateUpdateCard,
      deleteCard: mutateDeleteCard,
      moveCard: mutateMoveCard,
    }),
    [createCard, mutateUpdateCard, mutateDeleteCard, mutateMoveCard]
  )
}

export type CardMutations = ReturnType<typeof useCardMutations>
