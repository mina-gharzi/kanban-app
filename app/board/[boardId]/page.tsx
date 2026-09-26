'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Board from '@/components/Board'
import { getBoardData } from '@/lib/supabase/queries'
import { useBoardStore } from '@/store/boardStore'

export default function BoardPage() {
  const params = useParams()
  const boardId = params.boardId as string

  const setColumns = useBoardStore((s) => s.setColumns)
  const setCards = useBoardStore((s) => s.setCards)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadBoard() {
      try {
        setIsLoading(true)
        const { columns, cards } = await getBoardData(boardId)
        setColumns(columns)
        setCards(cards)
        setError(null)
      } catch (err) {
        console.error('خطا در دریافت بورد:', err)
        setError('مشکلی در دریافت اطلاعات بورد پیش اومد.')
      } finally {
        setIsLoading(false)
      }
    }

    if (boardId) loadBoard()
  }, [boardId, setColumns, setCards])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-column">در حال بارگذاری...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-accent">{error}</p>
      </div>
    )
  }

  return <Board boardId={boardId} />
}