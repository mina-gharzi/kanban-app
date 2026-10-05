import type { Metadata } from 'next'
import AccountPage from '@/components/account/AccountPage'
import AuthGuard from '@/components/AuthGuard'

export const metadata: Metadata = { title: 'حساب کاربری' }

export default function Page() {
  return (
    <AuthGuard>
      <AccountPage />
    </AuthGuard>
  )
}
