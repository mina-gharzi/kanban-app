"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import Column from "./Column";
import CardComponent from "./Card";
import AddColumnForm from "./AddColumnForm";
import CardModal from "./CardModal";
import { useBoardStore } from "@/store/boardStore";
import { useToastStore } from "@/store/toastStore";
import { useRealtimeBoard } from "@/lib/supabase/useRealtimeBoard";
import {
  addCard,
  addColumn,
  deleteCard,
  deleteColumn,
  updateManyCardPositions,
  updateColumnPositions,
  updateCardTitle,
  updateColumnTitle,
  updateCardDescription,
  updateCardLabel,
  updateCardDueDate,
} from "@/lib/supabase/queries";
import type { Card, Column as ColumnType } from "@/lib/supabase/queries";

type Props = {
  boardId: string;
};

export default function Board({ boardId }: Props) {
  useRealtimeBoard(boardId);

  const columns = useBoardStore((s) => s.columns);
  const cards = useBoardStore((s) => s.cards);
  const setCards = useBoardStore((s) => s.setCards);
  const setColumns = useBoardStore((s) => s.setColumns);
  const addCardLocal = useBoardStore((s) => s.addCardLocal);
  const removeCardLocal = useBoardStore((s) => s.removeCardLocal);
  const addColumnLocal = useBoardStore((s) => s.addColumnLocal);
  const removeColumnLocal = useBoardStore((s) => s.removeColumnLocal);
  const updateCardTitleLocal = useBoardStore((s) => s.updateCardTitleLocal);
  const updateColumnTitleLocal = useBoardStore((s) => s.updateColumnTitleLocal);
  const updateCardDescriptionLocal = useBoardStore(
    (s) => s.updateCardDescriptionLocal,
  );
  const updateCardLabelLocal = useBoardStore((s) => s.updateCardLabelLocal);
  const updateCardDueDateLocal = useBoardStore((s) => s.updateCardDueDateLocal);
  const addToast = useToastStore((s) => s.addToast);

  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null);
  const [openCard, setOpenCard] = useState<Card | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  function handleDragStart(event: DragStartEvent) {
    const card = cards.find((c) => c.id === event.active.id);
    if (card) {
      setActiveCard(card);
      return;
    }
    const column = columns.find((c) => c.id === event.active.id);
    if (column) setActiveColumn(column);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);
    setActiveColumn(null);
    if (!over) return;

    // حالت ۱: جابجایی خودِ ستون‌ها
    const draggedColumn = columns.find((c) => c.id === active.id);
    if (draggedColumn) {
      if (active.id === over.id) return;

      const oldIndex = sortedColumns.findIndex((c) => c.id === active.id);
      const newIndex = sortedColumns.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...sortedColumns];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const updates = reordered.map((c, index) => ({
        id: c.id,
        position: index,
      }));

      setColumns(
        columns.map((c) => {
          const update = updates.find((u) => u.id === c.id);
          return update ? { ...c, position: update.position } : c;
        }),
      );

      updateColumnPositions(updates).catch((err) => {
        console.error("خطا در آپدیت پوزیشن ستون:", err);
        addToast("جابجایی ستون با مشکل مواجه شد.");
      });
      return;
    }

    // حالت ۲: جابجایی کارت‌ها
    const activeCardItem = cards.find((c) => c.id === active.id);
    if (!activeCardItem) return;

    const overCard = cards.find((c) => c.id === over.id);
    const targetColumnId = overCard ? overCard.column_id : (over.id as string);

    if (
      targetColumnId === activeCardItem.column_id &&
      overCard?.id === active.id
    ) {
      return;
    }

    const targetColumnCards = cards
      .filter(
        (c) => c.column_id === targetColumnId && c.id !== activeCardItem.id,
      )
      .sort((a, b) => a.position - b.position);

    let insertIndex = targetColumnCards.length;
    if (overCard) {
      insertIndex = targetColumnCards.findIndex((c) => c.id === overCard.id);
      if (insertIndex === -1) insertIndex = targetColumnCards.length;
    }

    targetColumnCards.splice(insertIndex, 0, {
      ...activeCardItem,
      column_id: targetColumnId,
    });

    const cardUpdates = targetColumnCards.map((c, index) => ({
      id: c.id,
      column_id: targetColumnId,
      position: index,
    }));

    const updatedCards = cards.map((c) => {
      const update = cardUpdates.find((u) => u.id === c.id);
      return update
        ? { ...c, column_id: update.column_id, position: update.position }
        : c;
    });
    setCards(updatedCards);

    updateManyCardPositions(cardUpdates).catch((err) => {
      console.error("خطا در آپدیت پوزیشن کارت:", err);
      addToast("جابجایی کارت با مشکل مواجه شد.");
    });
  }

  async function handleAddCard(columnId: string, title: string) {
    const columnCards = cards.filter((c) => c.column_id === columnId);
    const newPosition = columnCards.length;
    try {
      const newCard = await addCard(columnId, title, newPosition);
      addCardLocal(newCard);
    } catch (err) {
      console.error("خطا در افزودن کارت:", err);
      addToast("افزودن کارت با مشکل مواجه شد.");
    }
  }

  async function handleDeleteCard(cardId: string) {
    removeCardLocal(cardId);
    try {
      await deleteCard(cardId);
    } catch (err) {
      console.error("خطا در حذف کارت:", err);
      addToast("حذف کارت با مشکل مواجه شد.");
    }
  }

  async function handleAddColumn(title: string) {
    const newPosition = columns.length;
    try {
      const newColumn = await addColumn(boardId, title, newPosition);
      addColumnLocal(newColumn);
    } catch (err) {
      console.error("خطا در افزودن ستون:", err);
      addToast("افزودن ستون با مشکل مواجه شد.");
    }
  }

  async function handleDeleteColumn(columnId: string) {
    removeColumnLocal(columnId);
    try {
      await deleteColumn(columnId);
    } catch (err) {
      console.error("خطا در حذف ستون:", err);
      addToast("حذف ستون با مشکل مواجه شد.");
    }
  }

  async function handleUpdateCardTitle(cardId: string, title: string) {
    updateCardTitleLocal(cardId, title);
    try {
      await updateCardTitle(cardId, title);
    } catch (err) {
      console.error("خطا در آپدیت عنوان کارت:", err);
      addToast("آپدیت عنوان کارت با مشکل مواجه شد.");
    }
  }

  async function handleUpdateColumnTitle(columnId: string, title: string) {
    updateColumnTitleLocal(columnId, title);
    try {
      await updateColumnTitle(columnId, title);
    } catch (err) {
      console.error("خطا در آپدیت عنوان ستون:", err);
      addToast("آپدیت عنوان ستون با مشکل مواجه شد.");
    }
  }

  async function handleUpdateCardDescription(
    cardId: string,
    description: string,
  ) {
    updateCardDescriptionLocal(cardId, description);
    try {
      await updateCardDescription(cardId, description);
    } catch (err) {
      console.error("خطا در آپدیت توضیحات:", err);
      addToast("آپدیت توضیحات با مشکل مواجه شد.");
    }
  }

  async function handleUpdateCardLabel(
    cardId: string,
    labelColor: string | null,
  ) {
    updateCardLabelLocal(cardId, labelColor);
    try {
      await updateCardLabel(cardId, labelColor);
    } catch (err) {
      console.error("خطا در آپدیت لیبل:", err);
      addToast("آپدیت لیبل با مشکل مواجه شد.");
    }
  }
  async function handleUpdateCardDueDate(
    cardId: string,
    dueDate: string | null,
  ) {
    updateCardDueDateLocal(cardId, dueDate);
    try {
      await updateCardDueDate(cardId, dueDate);
    } catch (err) {
      console.error("خطا در آپدیت تاریخ سررسید:", err);
      addToast("آپدیت تاریخ سررسید با مشکل مواجه شد.");
    }
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-6 overflow-x-auto min-h-screen bg-surface">
        <SortableContext
          items={sortedColumns.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
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
        </SortableContext>
        <AddColumnForm onAdd={handleAddColumn} />
      </div>

      <DragOverlay>
        {activeCard ? (
          <CardComponent card={activeCard} onOpen={() => {}} />
        ) : null}
        {activeColumn ? (
          <div className="min-w-65 max-w-65 bg-column rounded-xl p-3 opacity-90">
            <h3 className="text-surface font-medium text-sm">
              {activeColumn.title}
            </h3>
          </div>
        ) : null}
      </DragOverlay>

      {openCard && (
        <CardModal
          card={cards.find((c) => c.id === openCard.id) ?? openCard}
          onClose={() => setOpenCard(null)}
          onUpdateTitle={handleUpdateCardTitle}
          onUpdateDescription={handleUpdateCardDescription}
          onUpdateLabel={handleUpdateCardLabel}
          onUpdateDueDate={handleUpdateCardDueDate}
          onDelete={handleDeleteCard}
        />
      )}
    </DndContext>
  );
}
