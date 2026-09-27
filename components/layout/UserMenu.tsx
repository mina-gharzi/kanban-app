'use client'

import { useRouter } from 'next/navigation'
import { useAuthMutations } from '@/hooks/useAuthMutations'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import Dropdown, { type MenuItem } from '@/components/ui/Dropdown'
import { LogOutIcon } from '@/components/ui/icons'

/** حرف اول نام کاربری برای آواتار؛ بدون تصویر و بدون درخواست شبکه. */
function initialsOf(email: string): string {
  const name = email.split('@')[0] ?? ''
  return (name[0] ?? '?').toUpperCase()
}

export default function UserMenu() {
  const router = useRouter()
  const { user, isChecking } = useCurrentUser()
  const { signOut } = useAuthMutations()

  if (isChecking || !user) return null

  const email = user.email ?? ''
  const items: MenuItem[] = [
    {
      label: 'خروج از حساب',
      icon: <LogOutIcon size={16} />,
      onSelect: () =>
        signOut(undefined, { onSuccess: () => router.push('/login') }),
    },
  ]

  return (
    <Dropdown
      label="منوی کاربر"
      items={items}
      trigger={(props) => (
        <button
          {...props}
          className="flex items-center gap-2 rounded-md py-1 pe-1.5 ps-0.5 transition-colors hover:bg-surface-2"
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary"
          >
            {initialsOf(email)}
          </span>
          <span className="hidden max-w-40 truncate text-[13px] text-text-2 sm:inline">
            {email}
          </span>
        </button>
      )}
    />
  )
}
