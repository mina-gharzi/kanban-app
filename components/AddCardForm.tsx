'use client'

import { useState } from 'react'

type Props = {
  onAdd: (title: string) => void
}

export default function AddCardForm({ onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onAdd(title.trim())
    setTitle('')
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
        onChange={(e) => setTitle(e.target.value)}
        placeholder="عنوان کارت..."
        className="w-full bg-card text-surface text-sm rounded-md p-2 outline-none border border-transparent focus:border-accent"
      />
      <div className="flex gap-2 mt-2">
        <button
          type="submit"
          className="bg-accent text-surface text-xs rounded-md px-3 py-1.5"
        >
          افزودن
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-surface/60 text-xs px-3 py-1.5"
        >
          انصراف
        </button>
      </div>
    </form>
  )
}