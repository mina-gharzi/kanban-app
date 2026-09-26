'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import Column from './Column'
import CardComponent from './Card'
import AddColumnForm from './AddColumnForm'
import CardModal from './CardModal'
import { useBoardStore } from '@/store/boardStore'
import { useRealtimeBoard } from '@/lib/supabase/useRealtimeBoard'
import {
  addCard,
  addColumn,
  deleteCard,
  deleteColumn,
  updateManyCardPositions,
  updateCardTitle,
  updateColumnTitle,
  updateCardDescription,
} from '@/lib/supabase/queries'
import type { Card } from '@/lib/supabase/queries'

type Props = {
  boardId: string
}

export default function Board({ boardId }: Props) {
  useRealtimeBoard(boardId)

  const columns = useBoardStore((s) => s.columns)
  const cards = useBoardStore((s) => s.cards)
  const setCards = useBoardStore((s) => s.setCards)
  const addCardLocal = useBoardStore((s) => s.addCardLocal)
  const removeCardLocal = useBoardStore((s) => s.removeCardLocal)
  const addColumnLocal = useBoardStore((s) => s.addColumnLocal)
  const removeColumnLocal = useBoardStore((s) => s.removeColumnLocal)
  const updateCardTitleLocal = useBoardStore((s) => s.updateCardTitleLocal)
  const updateColumnTitleLocal = useBoardStore((s) => s.updateColumnTitleLocal)
  const updateCardDescriptionLocal = useBoardStore((s) => s.updateCardDescriptionLocal)

  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [openCard, setOpenCard] = useState<Card | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const card = cards.find((c) => c.id === event.active.id)
    setActiveCard(card ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null)
    const { active, over } = event
    if (!over) return

    const activeCard = cards.find((c) => c.id === active.id)
    if (!activeCard) return

    const overCard = cards.find((c) => c.id === over.id)
    const targetColumnId = overCard ? overCard.column_id : (over.id as string)

    if (targetColumnId === activeCard.column_id && overCard?.id === active.id) {
      return
    }

    const targetColumnCards = cards
      .filter((c) => c.column_id === targetColumnId && c.id !== activeCard.id)
      .sort((a, b) => a.position - b.position)

    let insertIndex = targetColumnCards.length
    if (overCard) {
      insertIndex = targetColumnCards.findIndex((c) => c.id === overCard.id)
      if (insertIndex === -1) insertIndex = targetColumnCards.length
    }

    targetColumnCards.splice(insertIndex, 0, { ...activeCard, column_id: targetColumnId })

    const updates = targetColumnCards.map((c, index) => ({
      id: c.id,
      column_id: targetColumnId,
      position: index,
    }))

    const updatedCards = cards.map((c) => {
      const update = updates.find((u) => u.id === c.id)
      return update ? { ...c, column_id: update.column_id, position: update.position } : c
    })
    setCards(updatedCards)

    updateManyCardPositions(updates).catch((err) => {
      console.error('خطا در آپدیت پوزیشن:', err)
    })
  }

  async function handleAddCard(columnId: string, title: string) {
    const columnCards = cards.filter((c) => c.column_id === columnId)
    const newPosition = columnCards.length
    try {
      const newCard = await addCard(columnId, title, newPosition)
      addCardLocal(newCard)
    } catch (err) {
      console.error('خطا در افزودن کارت:', err)
    }
  }

  async function handleDeleteCard(cardId: string) {
    removeCardLocal(cardId)
    try {
      await deleteCard(cardId)
    } catch (err) {
      console.error('خطا در حذف کارت:', err)
    }
  }

  async function handleAddColumn(title: string) {
    const newPosition = columns.length
    try {
      const newColumn = await addColumn(boardId, title, newPosition)
      addColumnLocal(newColumn)
    } catch (err) {
      console.error('خطا در افزودن ستون:', err)
    }
  }

  async function handleDeleteColumn(columnId: string) {
    removeColumnLocal(columnId)
    try {
      await deleteColumn(columnId)
    } catch (err) {
      console.error('خطا در حذف ستون:', err)
    }
  }

  async function handleUpdateCardTitle(cardId: string, title: string) {
    updateCardTitleLocal(cardId, title)
    try {
      await updateCardTitle(cardId, title)
    } catch (err) {
      console.error('خطا در آپدیت عنوان کارت:', err)
    }
  }

  async function handleUpdateColumnTitle(columnId: string, title: string) {
    updateColumnTitleLocal(columnId, title)
    try {
      await updateColumnTitle(columnId, title)
    } catch (err) {
      console.error('خطا در آپدیت عنوان ستون:', err)
    }
  }

  async function handleUpdateCardDescription(cardId: string, description: string) {
    updateCardDescriptionLocal(cardId, description)
    try {
      await updateCardDescription(cardId, description)
    } catch (err) {
      console.error('خطا در آپدیت توضیحات:', err)
    }
  }

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-6 overflow-x-auto min-h-screen bg-surface">
        {sortedColumns.map((column) => (
          <Column
            key={column.id}
            column={column}
            cards={cards.filter((c) => c.column_id === column.id)}
            onAddCard={handleAddCard}
            onDeleteColumn={handleDeleteColumn}
            onUpdateColumnTitle={handleUpdateColumnTitle}
            onOpenCard={setOpenCard}
          />
        ))}
        <AddColumnForm onAdd={handleAddColumn} />
      </div>

      <DragOverlay>
        {activeCard ? (
          <CardComponent card={activeCard} onOpen={() => {}} />
        ) : null}
      </DragOverlay>

      {openCard && (
        <CardModal
          card={cards.find((c) => c.id === openCard.id) ?? openCard}
          onClose={() => setOpenCard(null)}
          onUpdateTitle={handleUpdateCardTitle}
          onUpdateDescription={handleUpdateCardDescription}
          onDelete={handleDeleteCard}
        />
      )}
    </DndContext>
  )
}