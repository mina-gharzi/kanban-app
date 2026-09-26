import AuthGuard from '@/components/AuthGuard'
import BoardsList from '@/components/BoardsList'

export default function Home() {
  return (
    <AuthGuard>
      <BoardsList />
    </AuthGuard>
  )
}