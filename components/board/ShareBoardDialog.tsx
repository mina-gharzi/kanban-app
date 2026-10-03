'use client'

import { useState } from 'react'
import { useBoardSharing } from '@/hooks/useSharing'
import { buildInviteMessage } from '@/lib/sharing/messages'
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type InviteRole } from '@/lib/sharing/roles'
import { useToastStore } from '@/store/toastStore'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'

type Props = {
  boardId: string
  boardTitle: string
  isOwner: boolean
  currentUserId: string | null
  currentUserEmail: string | null
  onClose: () => void
  /** بعد از ترک بورد (عضو غیرمالک) */
  onLeft: () => void
}

const SELECT_CLASS =
  'h-9 rounded-md border border-border-input bg-surface px-2 text-meta text-text hover:border-text-2 focus:border-primary disabled:opacity-60'

export default function ShareBoardDialog({
  boardId, boardTitle, isOwner, currentUserId, currentUserEmail, onClose, onLeft,
}: Props) {
  const addToast = useToastStore((s) => s.addToast)
  const sharing = useBoardSharing(boardId, { isOwner, enabled: true })

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InviteRole>('editor')
  const [pendingRemove, setPendingRemove] = useState<{ userId: string; email: string } | null>(null)
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false)

  async function copyInviteMessage(inviteEmail: string, inviteRole: InviteRole) {
    const text = buildInviteMessage({
      boardTitle,
      email: inviteEmail,
      role: inviteRole,
      origin: window.location.origin,
    })
    try {
      await navigator.clipboard.writeText(text)
      addToast('پیام دعوت کپی شد؛ برای او بفرستید.', 'success')
    } catch {
      // clipboard در برخی مرورگرها/زمینه‌های ناامن در دسترس نیست
      addToast('کپی نشد. دسترسی به کلیپ‌بورد مسدود است.', 'error')
    }
  }

  function handleInvite(event: React.FormEvent) {
    event.preventDefault()
    const clean = email.trim()
    if (!clean) return
    sharing.invite(
      { email: clean, role },
      {
        onSuccess: () => {
          addToast(`دعوت ثبت شد، اما ایمیلی ارسال نمی‌شود؛ خودتان خبرش کنید («کپی پیام دعوت»).`, 'success')
          setEmail('')
        },
      }
    )
  }

  return (
    <>
      <Modal
        title="اشتراک‌گذاری بورد"
        description={`«${boardTitle}»`}
        onClose={onClose}
        size="md"
        footer={
          <>
            {!isOwner && (
              <Button variant="dangerGhost" className="me-auto" onClick={() => setIsConfirmingLeave(true)}>
                ترک بورد
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              بستن
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          {isOwner && (
            <form onSubmit={handleInvite} className="flex flex-col gap-3">
              <Field id="invite-email" label="دعوت با ایمیل">
                {({ id, describedBy }) => (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      type="email"
                      dir="ltr"
                      autoComplete="off"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@example.com"
                      className="flex-1"
                    />
                    <select
                      aria-label="نقش"
                      value={role}
                      onChange={(event) => setRole(event.target.value as InviteRole)}
                      className={`${SELECT_CLASS} sm:h-10`}
                    >
                      <option value="editor">{ROLE_LABELS.editor}</option>
                      <option value="viewer">{ROLE_LABELS.viewer}</option>
                    </select>
                    <Button type="submit" loading={sharing.isInviting} disabled={!email.trim() || sharing.isInviting}>
                      دعوت
                    </Button>
                  </div>
                )}
              </Field>
              <p className="text-chip leading-5 text-text-muted">
                {ROLE_DESCRIPTIONS[role]} ایمیلی ارسال نمی‌شود: دعوت‌شده باید با همین ایمیلِ تأییدشده وارد
                کانبان شود و دعوت را در صفحه‌ی «بوردهای من» ببیند و بپذیرد.
              </p>
            </form>
          )}

          <section aria-label="اعضا" className="flex flex-col gap-2">
            <h3 className="text-meta font-semibold text-text-2">اعضا</h3>
            <ul className="divide-y divide-border rounded-lg border border-border">
              <li className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="min-w-0 truncate text-body text-text" dir="auto">
                  {isOwner ? (currentUserEmail ?? 'شما') : 'مالک بورد'}
                  {isOwner && <span className="ms-1.5 text-chip text-text-muted">(شما)</span>}
                </span>
                <span className="shrink-0 rounded-sm bg-surface-2 px-2 py-1 text-chip text-text-2">{ROLE_LABELS.owner}</span>
              </li>

              {sharing.members.map((member) => {
                const isMe = member.user_id === currentUserId
                return (
                  <li key={member.user_id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="min-w-0 truncate text-body text-text" dir="auto">
                      {member.email}
                      {isMe && <span className="ms-1.5 text-chip text-text-muted">(شما)</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {isOwner ? (
                        <>
                          <select
                            aria-label={`نقش ${member.email}`}
                            value={member.role}
                            onChange={(event) =>
                              sharing.changeRole({ userId: member.user_id, role: event.target.value as InviteRole })
                            }
                            className={SELECT_CLASS}
                          >
                            <option value="editor">{ROLE_LABELS.editor}</option>
                            <option value="viewer">{ROLE_LABELS.viewer}</option>
                          </select>
                          <Button
                            variant="dangerGhost"
                            size="sm"
                            onClick={() => setPendingRemove({ userId: member.user_id, email: member.email })}
                          >
                            حذف
                          </Button>
                        </>
                      ) : (
                        <span className="rounded-sm bg-surface-2 px-2 py-1 text-chip text-text-2">
                          {ROLE_LABELS[member.role]}
                        </span>
                      )}
                    </span>
                  </li>
                )
              })}

              {sharing.members.length === 0 && !sharing.isLoadingMembers && (
                <li className="px-3 py-3 text-meta text-text-muted">هنوز عضو دیگری ندارد.</li>
              )}
            </ul>
            {sharing.membersError && (
              <p role="alert" className="text-meta text-danger">{sharing.membersError.userMessage}</p>
            )}
          </section>

          {isOwner && sharing.sentInvites.length > 0 && (
            <section aria-label="دعوت‌های در انتظار" className="flex flex-col gap-2">
              <h3 className="text-meta font-semibold text-text-2">دعوت‌های در انتظار پذیرش</h3>
              <p className="text-chip leading-5 text-text-muted">
                ایمیلی برای این افراد ارسال نشده. «کپی پیام دعوت» را بزنید و خودتان برایشان بفرستید.
              </p>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {sharing.sentInvites.map((invite) => (
                  <li key={invite.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="min-w-0 truncate text-body text-text" dir="ltr">{invite.email}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-sm bg-surface-2 px-2 py-1 text-chip text-text-2">{ROLE_LABELS[invite.role]}</span>
                      <Button variant="secondary" size="sm" onClick={() => void copyInviteMessage(invite.email, invite.role)}>
                        کپی پیام دعوت
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => sharing.revokeInvite(invite.id)}>
                        لغو
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </Modal>

      {pendingRemove && (
        <ConfirmDialog
          title="حذف عضو"
          description={`«${pendingRemove.email}» دیگر به این بورد دسترسی نخواهد داشت. کارت‌ها و ستون‌ها سر جایشان می‌مانند.`}
          confirmLabel="حذف عضو"
          onCancel={() => setPendingRemove(null)}
          onConfirm={() => {
            sharing.removeMember(pendingRemove.userId)
            setPendingRemove(null)
          }}
        />
      )}

      {isConfirmingLeave && currentUserId && (
        <ConfirmDialog
          title="ترک بورد"
          description="بعد از ترک، دیگر این بورد را نمی‌بینید. اگر دوباره دعوتتان کنند می‌توانید برگردید."
          confirmLabel="ترک بورد"
          onCancel={() => setIsConfirmingLeave(false)}
          onConfirm={() => {
            sharing.removeMember(currentUserId, { onSuccess: onLeft })
            setIsConfirmingLeave(false)
          }}
        />
      )}
    </>
  )
}
