'use client'

import { useState } from 'react'
import { validateTitle } from '@/lib/board/validation'

type Props = {
  onAdd: (title: string) => void
}

export default function AddCardForm({ onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validateTitle(title, 'card')
    if (validationError) {
      setFieldError(validationError.userMessage)
      return
    }
    onAdd(title.trim())
    setTitle('')
    setFieldError(null)
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full text-right text-sm text-surface/70 hover:text-surface py-2"
      >
        + افزودن کارت
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          setFieldError(null)
        }}
        placeholder="عنوان کارت..."
        aria-label="عنوان کارت جدید"
        aria-invalid={fieldError !== null}
        aria-describedby={fieldError ? 'add-card-error' : undefined}
        className="w-full bg-card text-surface text-sm rounded-md p-2 outline-none border border-transparent focus:border-accent"
      />
      {fieldError && (
        <p id="add-card-error" role="alert" className="text-accent text-xs mt-1">
          {fieldError}
        </p>
      )}
      <div className="flex gap-2 mt-2">
        <button
          type="submit"
          className="bg-accent text-surface text-xs rounded-md px-3 py-1.5"
        >
          افزودن
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false)
            setFieldError(null)
          }}
          className="text-surface/60 text-xs px-3 py-1.5"
        >
          انصراف
        </button>
      </div>
    </form>
  )
}
