'use client'

import { useRef } from 'react'
import Button from './Button'
import Modal from './Modal'
import { AlertTriangleIcon } from './icons'

type Props = {
  title: string
  description: string
  /** متن کنش مخرب؛ پیش‌فرض «حذف» */
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * تأیید برای کنش‌های مخرب (حذف کارت/ستون/بورد).
 * این دیالوگ **همیشه** انصراف را پیش‌فرض فوکوس می‌کند تا یک Enter
 * تصادفی کاربر را به حذف نرساند.
 */
export default function ConfirmDialog({
  title,
  description,
  confirmLabel = 'حذف',
  cancelLabel = 'انصراف',
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  return (
    <Modal
      title={title}
      onClose={onCancel}
      size="sm"
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
          <AlertTriangleIcon size={19} />
        </span>
        <p className="pt-1.5 text-body text-text-2">{description}</p>
      </div>
    </Modal>
  )
}
