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
          // `label` روی خودِ منو می‌نشیند، نه روی محرک. بدون این
          // aria-label دکمه هیچ نامی نداشت و screen reader آن را
          // صرفاً «button» می‌خواند. (props) هیچ aria-label‌ای نمی‌آورد،
          // پس این مقدار روی همان عنصر باقی می‌ماند.
          aria-label="منوی کاربر"
          className="flex items-center gap-2 rounded-md py-1 pe-1.5 ps-0.5 transition-colors hover:bg-surface-2"
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-chip font-semibold text-primary tabular"
          >
            {initialsOf(email)}
          </span>
          <span className="hidden max-w-40 truncate text-meta text-text-2 sm:inline">
            {email}
          </span>
        </button>
      )}
    />
  )
}
