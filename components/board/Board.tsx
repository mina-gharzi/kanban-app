'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ErrorState from '@/components/ErrorState'
import { useBoard } from '@/hooks/useBoard'
import { useBoardFilters } from '@/hooks/useBoardFilters'
import { useBoardRealtime } from '@/hooks/useBoardRealtime'
import { useBoards } from '@/hooks/useBoards'
import { useCardMutations } from '@/hooks/useCardMutations'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { permissionsFor } from '@/lib/sharing/roles'
import { useColumnMutations } from '@/hooks/useColumnMutations'
import AppShell from '@/components/layout/AppShell'
import BoardSidebar from '@/components/layout/BoardSidebar'
import BoardContent from './BoardContent'
import { BoardPermissionsProvider } from './BoardPermissions'
import ShareBoardDialog from './ShareBoardDialog'
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
  const [isSharing, setIsSharing] = useState(false)
  const router = useRouter()
  const { user } = useCurrentUser()

  const openCard = openCardId
    ? (cards.find((card) => card.id === openCardId) ?? null)
    : null

  const board = boards.find((item) => item.id === boardId)
  // نقش فقط برای رابط است (RLS مرجع است)؛ تا آمدن فهرست، محتاط‌ترین حالت: فقط‌خواندنی
  const permissions = permissionsFor(board?.role ?? 'viewer')

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
    <BoardPermissionsProvider permissions={permissions}>
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
        role={permissions.role}
        onShare={() => setIsSharing(true)}
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

      {isSharing && board && (
        <ShareBoardDialog
          boardId={boardId}
          boardTitle={board.title}
          isOwner={permissions.isOwner}
          currentUserId={user?.id ?? null}
          currentUserEmail={user?.email ?? null}
          onClose={() => setIsSharing(false)}
          onLeft={() => router.push('/boards')}
        />
      )}
    </AppShell>
    </BoardPermissionsProvider>
  )
}
