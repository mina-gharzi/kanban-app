'use client'

import { useBoardPermissions } from './BoardPermissions'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { CardMutations } from '@/hooks/useCardMutations'
import { isAppError } from '@/lib/errors/AppError'
import { ERROR_CODES } from '@/lib/errors/errorCodes'
import { validateTitle } from '@/lib/board/validation'
import type { Card as CardType, CardFieldPatch } from '@/lib/board/types'
import { LABEL_COLORS, resolveLabelKey } from '@/lib/labelColors'
import { formatDueDate, getDueDateStatus } from '@/lib/dueDate'
import {
  CARD_FIELD_LABELS,
  buildCardPatch,
  detectCardEditConflicts,
  readCardFields,
  readDraftFields,
} from '@/lib/board/conflict'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Textarea from '@/components/ui/Textarea'
import { AlertTriangleIcon, CalendarIcon, CheckIcon } from '@/components/ui/icons'

type Props = {
  card: CardType
  cardMutations: CardMutations
  onClose: () => void
}

/**
 * جزئیات کارت.
 *
 * رفتار پایه حفظ شده: یک Save با یک patch واحد (یک mutation، یک به‌روزرسانی
 * خوش‌بینانه، یک invalidate) و لیبل که بلافاصله و جداگانه ذخیره می‌شود
 * چون خودش یک toggle است، نه بخشی از فرم.
 *
 * سه تضمین جدید:
 *
 * ۱) تعارض هم‌زمان: هنگام باز شدن، مقادیر فیلدهای قابل‌ویرایش snapshot
 *    می‌شوند. `card` از Query Cache/Realtime می‌آید، پس اگر کاربر دیگری در
 *    همان فیلدی که کاربر دست زده تغییری بدهد، بدون reload دیده می‌شود.
 *    در آن حالت Save به «ذخیره به هر حال» تبدیل می‌شود تا بازنویسیِ
 *    خاموش رخ ندهد.
 *
 * ۲) بستن فقط بعد از موفقیت واقعی: `mutateAsync` (نه `mutate`) استفاده
 *    می‌شود؛ `onClose` فقط پس از resolve شدن mutation صدا زده می‌شود. در
 *    خطا modal باز می‌ماند و draft کاربر دست‌نخورده می‌ماند.
 *
 * ۳) دابل‌کلیک: guard بر پایه‌ی ref است نه `isPending`. چون `isPending`
 *    فقط بعد از re-render به‌روز می‌شود، دو submit هم‌زمان در یک tick هر دو
 *    `false` می‌دیدند و دو mutation می‌فرستادند.
 */
export default function CardModal({ card, cardMutations, onClose }: Props) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? '')
  const [dueDate, setDueDate] = useState(card.due_date ?? '')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  /**
   * مقادیر اولیه در لحظه‌ی باز شدن modal.
   *
   * `useState` با lazy initializer، نه ref: این مقدار در render واقعاً
   * استفاده می‌شود (مقایسه‌ی تعارض) و ref طبق قواعد React Hooks برای
   * دسترسی در render مناسب نیست. تا وقتی modal باز است ثابت می‌ماند مگر
   * اینکه کاربور «بارگذاری آخرین نسخه» را بزند.
   */
  const [base, setBase] = useState(() => readCardFields(card))
  /** guard دابل‌کلیک؛ فقط در event handler خوانده می‌شود، نه در render */
  const busyRef = useRef(false)

  const isPending = cardMutations.isUpdating || cardMutations.isDeleting

  const dueDateStatus = getDueDateStatus(card.due_date)

  const draft = useMemo(
    () => readDraftFields({ title, description, dueDate }),
    [title, description, dueDate]
  )
  const server = useMemo(() => readCardFields(card), [card])
  const conflicts = useMemo(
    () => detectCardEditConflicts(base, draft, server),
    [base, draft, server]
  )

  const handleClose = useCallback(() => {
    // تا پایان mutation بسته نمی‌شود؛ `dismissible=false` هم راه‌های دیگر
    // بستن را می‌بندد و این guard لایه‌ی دوم است
    if (busyRef.current) return
    onClose()
  }, [onClose])

  const handleSave = useCallback(async () => {
    if (busyRef.current) return

    // خطای اعتبارسنجی کنار همان فیلد نمایش داده می‌شود، نه به‌صورت toast
    const titleValidation = validateTitle(title, 'card')
    if (titleValidation) {
      setTitleError(titleValidation.userMessage)
      return
    }

    // یک patch واحد: یک mutation، یک به‌روزرسانی خوش‌بینانه، یک invalidate.
    // فقط فیلدهایی که کاربر دست زده (draft ≠ base) و هنوز روی سرور آن مقدار
    // را ندارند (draft ≠ server). `expected` مقدار خامِ فعلیِ سرور برای همان
    // فیلدهاست؛ دیتابیس فقط در صورتی می‌نویسد که تا این لحظه عوض نشده باشند.
    // در تعارضِ آگاهانه («ذخیره به هر حال») هم expected همان مقدار جدید سرور
    // است، یعنی بازنویسی فقط نسخه‌ای را می‌گیرد که کاربر دیده.
    const fullPatch = buildCardPatch(base, draft)
    const patch: Record<string, string | null> = {}
    const expected: Record<string, string | null> = {}
    for (const field of Object.keys(fullPatch) as Array<keyof typeof fullPatch>) {
      if (draft[field] === server[field]) continue
      patch[field] = fullPatch[field] ?? null
      expected[field] = card[field]
    }
    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }

    busyRef.current = true
    setSaveError(null)
    try {
      await cardMutations.updateCardAsync({
        cardId: card.id,
        patch: patch as CardFieldPatch,
        expected: expected as CardFieldPatch,
      })
      onClose()
    } catch (error) {
      if (isAppError(error) && error.code === ERROR_CODES.CONFLICT) {
        setSaveError(
          'کارت همین لحظه در جای دیگری تغییر کرد. آخرین نسخه بارگذاری می‌شود؛ تغییراتتان را بررسی و دوباره ذخیره کنید.'
        )
      } else {
        setSaveError('ذخیره نشد. تغییرات شما اینجاست؛ دوباره تلاش کنید.')
      }
    } finally {
      busyRef.current = false
    }
  }, [base, card, cardMutations, draft, onClose, server, title])

  const handleLabelClick = useCallback(
    (color: string) => {
      if (busyRef.current) return
      // toggle است، نه بخشی از فرم: پس‌زمینه اجرا می‌شود
      cardMutations.updateCard({
        cardId: card.id,
        patch: {
          label_color: resolveLabelKey(card.label_color) === color ? null : color,
        },
      })
    },
    [card.id, card.label_color, cardMutations]
  )

  const handleReloadLatest = useCallback(() => {
    if (busyRef.current) return
    // پایه هم با سرور هم‌تراز می‌شود، وگرنه تعارض بلافاصله برمی‌گردد
    setBase(readCardFields(card))
    setTitle(card.title)
    setDescription(card.description ?? '')
    setDueDate(card.due_date ?? '')
    setTitleError(null)
    setSaveError(null)
  }, [card])

  const handleConfirmDelete = useCallback(async () => {
    if (busyRef.current) return

    busyRef.current = true
    try {
      await cardMutations.deleteCardAsync(card.id)
      onClose()
    } catch {
      // دیالوگ بسته می‌شود ولی خود modal با پیام خطا باز می‌ماند تا retry ممکن باشد
      setIsConfirmingDelete(false)
      setSaveError('حذف نشد. دوباره تلاش کنید.')
    } finally {
      busyRef.current = false
    }
  }, [card.id, cardMutations, onClose])

  const { canEdit } = useBoardPermissions()

  return (
    <>
      <Modal
        title="جزئیات کارت"
        onClose={handleClose}
        size="lg"
        dismissible={!isPending}
        footer={
          !canEdit ? (
            <Button variant="secondary" onClick={handleClose}>
              بستن
            </Button>
          ) : (
          <>
            <Button
              variant="dangerGhost"
              className="me-auto"
              onClick={() => setIsConfirmingDelete(true)}
              disabled={isPending}
            >
              حذف کارت
            </Button>
            <Button variant="secondary" onClick={handleClose} disabled={isPending}>
              انصراف
            </Button>
            <Button
              onClick={handleSave}
              loading={isPending}
              disabled={isPending}
            >
              {isPending
                ? 'در حال ذخیره…'
                : conflicts.length > 0
                  ? 'ذخیره به هر حال'
                  : 'ذخیره تغییرات'}
            </Button>
          </>
          )
        }
      >
        <div className="flex flex-col gap-6">
          {conflicts.length > 0 && (
            <div
              role="alert"
              className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3.5"
            >
              <span className="mt-0.5 shrink-0 text-warning">
                <AlertTriangleIcon size={17} />
              </span>
              <div className="min-w-0 space-y-2.5">
                <p className="text-body text-text">
                  این کارت در جای دیگری تغییر کرده است. اگر «ذخیره به هر حال» را
                  بزنید، نسخه‌ی جدیدتر بازنویسی می‌شود.
                </p>
                <p className="text-meta text-text-2">
                  فیلدهای درگیر:{' '}
                  {conflicts.map((field) => CARD_FIELD_LABELS[field]).join('، ')}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleReloadLatest}
                  disabled={isPending}
                >
                  بارگذاری آخرین نسخه
                </Button>
              </div>
            </div>
          )}

          {saveError && (
            <p
              role="alert"
              className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-meta text-danger"
            >
              {saveError}
            </p>
          )}

          <Field id="card-title" label="عنوان" error={titleError}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                value={title}
                readOnly={!canEdit}
                invalid={invalid}
                onChange={(event) => {
                  setTitle(event.target.value)
                  setTitleError(null)
                }}
                placeholder="عنوان کارت"
              />
            )}
          </Field>

          <fieldset>
            <legend className="mb-2 text-meta font-medium text-text-2">
              لیبل
            </legend>
            <div className="flex flex-wrap gap-2">
              {LABEL_COLORS.map((label) => {
                const isActive = resolveLabelKey(card.label_color) === label.key
                return (
                  <button
                    key={label.key}
                    type="button"
                    title={label.name}
                    aria-label={`لیبل ${label.name}`}
                    aria-pressed={isActive}
                    disabled={isPending || !canEdit}
                    onClick={() => handleLabelClick(label.key)}
                    className={[
                      // چیپ است، نه دکمهٔ گرد: `radius-full` فقط برای دایرهٔ
                      // واقعی (DESIGN_PLAN.md §۷)
                      'flex h-7 items-center gap-1.5 rounded-sm border px-2',
                      'text-chip transition-colors duration-150 ease-out-soft',
                      'disabled:pointer-events-none disabled:opacity-55',
                      isActive
                        ? 'border-primary bg-primary-soft font-medium text-primary'
                        : 'border-border bg-surface text-text-2 hover:border-border-2 hover:bg-surface-2',
                    ].join(' ')}
                  >
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: label.value }}
                    />
                    {label.name}
                    {isActive && <CheckIcon size={13} />}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <Field
            id="card-due-date"
            label="تاریخ سررسید"
            hint={
              card.due_date
                ? `${formatDueDate(card.due_date)}${
                    dueDateStatus === 'overdue' ? ' — از موعد گذشته' : ''
                  }`
                : undefined
            }
          >
            {({ id, describedBy, invalid }) => (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <CalendarIcon
                    size={15}
                    className="pointer-events-none absolute inset-y-0 start-3 my-auto text-text-muted"
                  />
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    type="date"
                    disabled={!canEdit}
                    className="ps-9"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </div>
                {dueDate && canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDueDate('')}
                    disabled={isPending}
                  >
                    پاک کردن
                  </Button>
                )}
              </div>
            )}
          </Field>

          <Field id="card-description" label="توضیحات">
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                aria-describedby={describedBy}
                value={description}
                readOnly={!canEdit}
                onChange={(event) => setDescription(event.target.value)}
                rows={6}
                placeholder="جزئیات، معیار انجام‌شدن، لینک‌ها…"
              />
            )}
          </Field>
        </div>
      </Modal>

      {isConfirmingDelete && (
        <ConfirmDialog
          title="حذف کارت"
          description={`کارت «${card.title}» برای همیشه حذف می‌شود. این عمل قابل بازگشت نیست.`}
          confirmLabel="حذف کارت"
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  )
}
