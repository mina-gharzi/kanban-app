'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDeleteAccount, useDeletionPreview } from '@/hooks/useAccount'
import { normalizeError } from '@/lib/errors/normalizeError'
import type { SharedBoardsPolicy } from '@/lib/supabase/account'
import { useToastStore } from '@/store/toastStore'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'

const fa = (n: number) => n.toLocaleString('fa-IR')

export default function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const addToast = useToastStore((s) => s.addToast)
  const formId = useId()
  const preview = useDeletionPreview(true)
  const del = useDeleteAccount()

  const [policy, setPolicy] = useState<SharedBoardsPolicy>('transfer')
  const [password, setPassword] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)

  const data = preview.data
  const hasShared = (data?.shared_boards.length ?? 0) > 0
  const canSubmit = Boolean(data) && password.length > 0 && acknowledged && !del.isPending
  const errorMessage = del.error ? normalizeError(del.error).userMessage : null

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    del.mutate(
      { password, sharedBoards: hasShared ? policy : 'transfer' },
      {
        onSuccess: () => {
          addToast('حساب شما حذف شد.', 'success')
          router.replace('/')
        },
        onError: () => setPassword(''),
      },
    )
  }

  return (
    <Modal
      title="حذف حساب"
      description="این کار قابل بازگشت نیست."
      onClose={onClose}
      dismissible={!del.isPending}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={del.isPending}>
            انصراف
          </Button>
          <Button type="submit" form={formId} variant="danger" loading={del.isPending} disabled={!canSubmit}>
            حذف دائمی حساب
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-5">
        {preview.isPending && (
          <p role="status" className="text-meta text-text-muted">در حال بررسی بوردهای شما…</p>
        )}

        {preview.isError && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-meta leading-6 text-danger">
            بررسی بوردهایتان انجام نشد.{' '}
            <button type="button" className="font-semibold underline underline-offset-4" onClick={() => void preview.refetch()}>
              تلاش دوباره
            </button>
          </div>
        )}

        {data && (
          <>
            <ul className="list-disc space-y-1.5 ps-5 text-meta leading-6 text-text-2">
              <li>حساب و ایمیل شما برای همیشه پاک می‌شود.</li>
              {data.solo_boards > 0 && (
                <li>
                  <strong className="text-text">{fa(data.solo_boards)} بورد</strong> که فقط مال شماست، با همه‌ی ستون‌ها و
                  کارت‌هایش حذف می‌شود.
                </li>
              )}
              {data.memberships > 0 && (
                <li>از <strong className="text-text">{fa(data.memberships)} بورد</strong> دیگران که عضو آن هستید خارج می‌شوید.</li>
              )}
              <li>دعوت‌های ارسال‌شده به ایمیل شما حذف می‌شود.</li>
            </ul>

            {hasShared && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-meta font-semibold text-text">
                  {fa(data.shared_boards.length)} بورد مشترک دارید؛ با آن‌ها چه شود؟
                </legend>

                <div className="rounded-lg border border-border-input p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
                  <label className="flex cursor-pointer items-start gap-2.5 text-meta font-semibold leading-6 text-text">
                    <input type="radio" name="shared-policy" value="transfer" checked={policy === 'transfer'} onChange={() => setPolicy('transfer')} aria-describedby={`${formId}-transfer`} className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--primary))]" />
                    انتقال مالکیت به اعضا (پیشنهادی)
                  </label>
                  <ul id={`${formId}-transfer`} className="mt-1 space-y-0.5 ps-6 text-meta leading-6 text-text-2">
                    {data.shared_boards.map((board) => (
                      <li key={board.board_id}>
                        «{board.title}» ← <span dir="ltr">{board.new_owner_email ?? '—'}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-border-input p-3 has-[:checked]:border-danger has-[:checked]:bg-danger-soft">
                  <label className="flex cursor-pointer items-start gap-2.5 text-meta font-semibold leading-6 text-text">
                    <input type="radio" name="shared-policy" value="delete" checked={policy === 'delete'} onChange={() => setPolicy('delete')} aria-describedby={`${formId}-delete`} className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--danger))]" />
                    حذف این بوردها برای همه
                  </label>
                  <p id={`${formId}-delete`} className="mt-1 ps-6 text-meta leading-6 text-text-2">
                    اعضای دیگر هم دسترسی و محتوای آن‌ها را از دست می‌دهند.
                  </p>
                </div>
              </fieldset>
            )}

            <Field id="delete-password" label="برای تأیید، رمز عبورتان را بنویسید" required error={errorMessage}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  type="password"
                  autoComplete="current-password"
                  dir="ltr"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              )}
            </Field>

            <label className="flex cursor-pointer items-start gap-2.5 text-meta leading-6 text-text-2">
              <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--primary))]" />
              می‌دانم که حذف حساب قابل بازگشت نیست.
            </label>
          </>
        )}
      </form>
    </Modal>
  )
}
