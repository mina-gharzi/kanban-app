'use client'

import { useState } from 'react'
import ErrorState from '@/components/ErrorState'
import { useBoard } from '@/hooks/useBoard'
import { useBoardFilters } from '@/hooks/useBoardFilters'
import { useBoardRealtime } from '@/hooks/useBoardRealtime'
import { useBoards } from '@/hooks/useBoards'
import { useCardMutations } from '@/hooks/useCardMutations'
import { useColumnMutations } from '@/hooks/useColumnMutations'
import AppShell from '@/components/layout/AppShell'
import BoardSidebar from '@/components/layout/BoardSidebar'
import BoardContent from './BoardContent'
import BoardFilters from './BoardFilters'
import BoardHeader from './BoardHeader'
import BoardSkeleton from './BoardSkeleton'
import CardModal from './CardModal'

type Props = {
  boardId: string
}

export default function Board({ boardId }: Props) {
  const realtimeStatus = useBoardRealtime(boardId)

  // Server state از Query Cache
  const { cards, sortedColumns, isPending, error, refetch } = useBoard(boardId)
  // همان cache بوردها؛ بدون درخواست شبکه‌ی دوم، فقط نام بورد را می‌خواهیم
  const { boards } = useBoards()
  const cardMutations = useCardMutations(boardId)
  const columnMutations = useColumnMutations(boardId)

  // Client / UI state
  const {
    searchQuery,
    onSearchChange,
    activeLabelFilter,
    onLabelFilterChange,
    hasActiveFilter,
    visibleCardIds,
  } = useBoardFilters(cards)
  const [openCardId, setOpenCardId] = useState<string | null>(null)

  const openCard = openCardId
    ? (cards.find((card) => card.id === openCardId) ?? null)
    : null

  const board = boards.find((item) => item.id === boardId)

  // اسکلت داخل همان پوسته رندر می‌شود تا هدر و سایدبار نپرند
  if (isPending) {
    return (
      <AppShell sidebar={BoardSidebar}>
        <BoardSkeleton />
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell sidebar={BoardSidebar}>
        <ErrorState error={error} onRetry={refetch} />
      </AppShell>
    )
  }

  return (
    <AppShell
      sidebar={BoardSidebar}
      headerMeta={
        <span className="truncate text-meta text-text-2">{board?.title}</span>
      }
    >
      <BoardHeader
        board={board}
        cardCount={cards.length}
        realtimeStatus={realtimeStatus}
      />

      <div className="border-b border-border px-4 py-2.5 sm:px-6">
        <BoardFilters
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          activeLabelFilter={activeLabelFilter}
          onLabelFilterChange={onLabelFilterChange}
          hasActiveFilter={hasActiveFilter}
        />
      </div>

      <BoardContent
        columns={sortedColumns}
        cards={cards}
        visibleCardIds={visibleCardIds}
        isFilterActive={hasActiveFilter}
        cardMutations={cardMutations}
        columnMutations={columnMutations}
        onOpenCard={setOpenCardId}
      />

      {openCard && (
        <CardModal
          card={openCard}
          cardMutations={cardMutations}
          onClose={() => setOpenCardId(null)}
        />
      )}
    </AppShell>
  )
}
