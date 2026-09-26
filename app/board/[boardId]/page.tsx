'use client'

import { useParams } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import Board from '@/components/board/Board'

export default function BoardPage() {
  const params = useParams()
  const boardId = params.boardId as string

  return (
    <AuthGuard>
      <Board boardId={boardId} />
    </AuthGuard>
  )
}
