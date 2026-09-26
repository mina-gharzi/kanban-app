'use client'

import { useState } from 'react'
import { useBoard } from '@/hooks/useBoard'
import { useBoardFilters } from '@/hooks/useBoardFilters'
import { useBoardRealtime } from '@/hooks/useBoardRealtime'
import { useCardMutations } from '@/hooks/useCardMutations'
import { useColumnMutations } from '@/hooks/useColumnMutations'
import BoardContent from './BoardContent'
import BoardFilters from './BoardFilters'
import CardModal from './CardModal'

type Props = {
  boardId: string
}

export default function Board({ boardId }: Props) {
  useBoardRealtime(boardId)

  // Server state از Query Cache
  const { cards, sortedColumns, isPending, isError } = useBoard(boardId)
  const cardMutations = useCardMutations(boardId)
  const columnMutations = useColumnMutations(boardId)

  // Client / UI state
  const {
    searchQuery,
    onSearchChange,
    activeLabelFilter,
    onLabelFilterChange,
    visibleCardIds,
  } = useBoardFilters(cards)
  const [openCardId, setOpenCardId] = useState<string | null>(null)

  const openCard = openCardId
    ? (cards.find((card) => card.id === openCardId) ?? null)
    : null

  if (isPending) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-column">در حال بارگذاری...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-accent">مشکلی در دریافت اطلاعات بورد پیش اومد.</p>
      </div>
    )
  }

  return (
    <>
      <BoardFilters
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        activeLabelFilter={activeLabelFilter}
        onLabelFilterChange={onLabelFilterChange}
      />

      <BoardContent
        columns={sortedColumns}
        cards={cards}
        visibleCardIds={visibleCardIds}
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
    </>
  )
}
