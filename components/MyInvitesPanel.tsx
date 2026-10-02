'use client'

import { useReceivedInvites } from '@/hooks/useSharing'
import { ROLE_LABELS } from '@/lib/sharing/roles'
import Button from '@/components/ui/Button'
import { UsersIcon } from '@/components/ui/icons'

/** دعوت‌های دریافتی؛ اگر دعوتی نباشد هیچ‌چیز رندر نمی‌شود */
export default function MyInvitesPanel() {
  const { invites, accept, decline, isBusy } = useReceivedInvites()
  if (invites.length === 0) return null

  return (
    <section
      aria-label="دعوت‌های شما"
      className="mt-6 rounded-2xl border border-primary/30 bg-primary-soft p-4 sm:p-5"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
        <UsersIcon size={16} className="text-primary" />
        دعوت‌های شما
      </h2>

      <ul className="mt-3 flex flex-col gap-2">
        {invites.map((invite) => (
          <li
            key={invite.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-bg px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="min-w-0 text-meta leading-6 text-text-2">
              <span dir="ltr" className="font-medium text-text">
                {invite.invited_by_email ?? 'یک کاربر'}
              </span>{' '}
              شما را با نقش «{ROLE_LABELS[invite.role]}» به بوردِ{' '}
              <span className="font-semibold text-text">«{invite.board_title}»</span> دعوت کرده است.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" disabled={isBusy} onClick={() => accept(invite.id)}>
                پذیرفتن
              </Button>
              <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => decline(invite.id)}>
                رد کردن
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
