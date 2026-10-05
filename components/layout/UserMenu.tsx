'use client'

import { useRouter } from 'next/navigation'
import { useAuthMutations } from '@/hooks/useAuthMutations'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { boardColor } from '@/lib/board/boardColor'
import { readableInk } from '@/lib/labelColors'
import Dropdown, { type MenuItem } from '@/components/ui/Dropdown'
import { BoardsIcon, ChevronDownIcon, LogOutIcon, UserIcon } from '@/components/ui/icons'

/** اولین نویسه‌ی بخش محلی ایمیل؛ ایمیل خالی ⇒ علامت سؤال */
function initialsOf(email: string): string {
  const name = email.split('@')[0] ?? ''
  return (Array.from(name)[0] ?? '?').toUpperCase()
}

/**
 * منوی کاربر. ایمیل دیگر در خودِ سربرگ چاپ نمی‌شود (جا می‌گرفت و با
 * ایمیل بلند شلوغ می‌شد)؛ فقط آواتار است و هویت داخل منو نمایش داده می‌شود.
 * رنگ آواتار از شناسه‌ی کاربر می‌آید، هم‌سو با رنگ هویتی بوردها.
 */
export default function UserMenu() {
  const router = useRouter()
  const { user, isChecking } = useCurrentUser()
  const { signOut } = useAuthMutations()

  if (isChecking || !user) return null

  const email = user.email ?? ''
  const color = boardColor(user.id)

  const avatar = (size: 'sm' | 'md') => (
    <span
      aria-hidden="true"
      className={[
        'flex shrink-0 items-center justify-center rounded-full font-semibold tabular',
        size === 'sm' ? 'h-8 w-8 text-chip' : 'h-9 w-9 text-meta',
      ].join(' ')}
      style={{ backgroundColor: color, color: readableInk(color) }}
    >
      {initialsOf(email)}
    </span>
  )

  const items: MenuItem[] = [
    {
      label: 'بوردهای من',
      icon: <BoardsIcon size={16} />,
      onSelect: () => router.push('/boards'),
    },
    {
      label: 'حساب کاربری',
      icon: <UserIcon size={16} />,
      onSelect: () => router.push('/account'),
    },
    {
      label: 'خروج از حساب',
      icon: <LogOutIcon size={16} />,
      tone: 'danger',
      onSelect: () => signOut(undefined, { onSuccess: () => router.push('/login') }),
    },
  ]

  return (
    <Dropdown
      label="منوی کاربر"
      items={items}
      menuClassName="min-w-56"
      header={
        <div className="flex items-center gap-2.5">
          {avatar('md')}
          <div className="min-w-0">
            <p className="text-chip text-text-muted">وارد شده با</p>
            <p className="truncate text-meta font-medium text-text" dir="ltr" title={email}>
              {email}
            </p>
          </div>
        </div>
      }
      trigger={(props) => (
        <button
          {...props}
          // `label` روی خودِ منو می‌نشیند، نه روی محرک؛ بدون این aria-label دکمه
          // هیچ نامی نداشت و screen reader صرفاً «button» می‌خواند.
          aria-label="منوی کاربر"
          className="group flex items-center gap-1 rounded-full p-0.5 pe-1.5 transition-colors hover:bg-surface-2"
        >
          {avatar('sm')}
          <ChevronDownIcon
            size={14}
            className="text-text-muted transition-transform duration-150 group-aria-expanded:rotate-180"
          />
        </button>
      )}
    />
  )
}
