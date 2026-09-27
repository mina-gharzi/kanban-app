'use client'

import { useRef, useState } from 'react'
import { validateTitle } from '@/lib/board/validation'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import Input from '@/components/ui/Input'
import { PlusIcon, XIcon } from '@/components/ui/icons'

type Props = {
  onAdd: (title: string) => void
}

/**
 * فرم «افزودن کارت».
 *
 * دو حالت دارد: یک دکمه‌ی آرام که به Input تبدیل می‌شود، و فرم باز.
 * موفقیت فرم را می‌بندد تا افزودن پشت‌سرهم بدون کلیک اضافه ممکن باشد؛
 * خطا فرم را باز نگه می‌دارد و کنار فیلد نشان می‌دهد.
 */
export default function AddCardForm({ onAdd }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function open() {
    setIsOpen(true)
    // بعد از رندر شدن Input فوکوس می‌گیریم
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function close() {
    setIsOpen(false)
    setTitle('')
    setError(null)
  }

  function submit() {
    const validationError = validateTitle(title, 'card')
    if (validationError) {
      setError(validationError.userMessage)
      return
    }
    onAdd(title.trim())
    // فرم باز می‌ماند تا کاربر بتواند چند کارت پشت‌سرهم اضافه کند
    setTitle('')
    setError(null)
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={open}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
      >
        <PlusIcon size={15} />
        افزودن کارت
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-2 shadow-xs">
      <Input
        ref={inputRef}
        size="sm"
        value={title}
        invalid={error !== null}
        placeholder="عنوان کارت"
        aria-label="عنوان کارت جدید"
        onChange={(event) => {
          setTitle(event.target.value)
          setError(null)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit()
          if (event.key === 'Escape') close()
        }}
      />
      {error && (
        <p role="alert" className="text-[11px] text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center gap-1.5">
        <Button size="sm" onClick={submit}>
          افزودن کارت
        </Button>
        <IconButton label="انصراف" size="sm" onClick={close}>
          <XIcon size={15} />
        </IconButton>
      </div>
    </div>
  )
}
