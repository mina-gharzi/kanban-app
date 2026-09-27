'use client'

import { useEffect, useRef, useState } from 'react'
import { validateTitle } from '@/lib/board/validation'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import Input from '@/components/ui/Input'
import { PlusIcon, XIcon } from '@/components/ui/icons'

type Props = {
  onAdd: (title: string) => void
}

/**
 * فرم «افزودن ستون» در انتهای بورد.
 *
 * فرم بعد از موفقیت بسته می‌شود؛ محدودیت سقف ستون در لایه‌ی داده
 * (`createColumn`) اعمال می‌شود و این کامپوننت چیزی اختراع نمی‌کند.
 */
export default function AddColumnForm({ onAdd }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  function open() {
    setIsOpen(true)
    setError(null)
  }

  function close() {
    setIsOpen(false)
    setTitle('')
    setError(null)
  }

  function submit() {
    const validationError = validateTitle(title, 'column')
    if (validationError) {
      setError(validationError.userMessage)
      return
    }
    onAdd(title.trim())
    close()
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={open}
        className="flex w-64 shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-border-2 px-3 py-2.5 text-[13px] text-text-2 transition-colors hover:border-border-2 hover:bg-surface-2 hover:text-text"
      >
        <PlusIcon size={15} />
        افزودن ستون
      </button>
    )
  }

  return (
    <div className="flex w-64 shrink-0 flex-col gap-1.5 rounded-xl border border-border bg-surface p-2 shadow-xs">
      <Input
        ref={inputRef}
        size="sm"
        value={title}
        invalid={error !== null}
        placeholder="نام ستون"
        aria-label="نام ستون جدید"
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
          افزودن ستون
        </Button>
        <IconButton label="انصراف" size="sm" onClick={close}>
          <XIcon size={15} />
        </IconButton>
      </div>
    </div>
  )
}
