import AuthGuard from '@/components/AuthGuard'
import BoardsList from '@/components/BoardsList'

export default function BoardsPage() {
  return (
    <AuthGuard>
      <BoardsList />
    </AuthGuard>
  )
}