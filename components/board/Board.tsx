'use client'

import { useState } from 'react'
import ErrorState from '@/components/ErrorState'
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
  const realtimeStatus = useBoardRealtime(boardId)

  // Server state از Query Cache
  const { cards, sortedColumns, isPending, error, refetch } = useBoard(boardId)
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

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />
  }

  return (
    <>
      <BoardFilters
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        activeLabelFilter={activeLabelFilter}
        onLabelFilterChange={onLabelFilterChange}
      />

      {realtimeStatus === 'error' && (
        <p
          role="status"
          className="bg-accent/20 text-accent text-xs px-4 py-2 text-center"
        >
          ارتباط بلادرنگ قطع شد. در حال اتصال دوباره...
        </p>
      )}

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
