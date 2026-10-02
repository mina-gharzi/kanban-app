'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isChecking } = useCurrentUser()

  useEffect(() => {
    if (!isChecking && !user) router.replace('/login')
  }, [isChecking, user, router])

  // تا وقتی بررسی تمام نشده، هیچ محتوایی رندر نمی‌شود تا flash محتوای
  // محافظت‌شده دیده نشود
  if (isChecking) return <AuthCheckingScreen />
  if (!user) return null // در حال ریدایرکت

  return <>{children}</>
}

/** اسکلت به‌جای متن ساده، تا ارتفاع صفحه نپرد. */
function AuthCheckingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-3" role="status">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-surface-3" />
        <p className="text-meta text-text-muted">در حال بررسی نشست…</p>
      </div>
    </div>
  )
}
