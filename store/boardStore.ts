import { create } from "zustand";
import type { Card, Column } from "@/lib/supabase/queries";

type BoardState = {
  columns: Column[];
  cards: Card[];
  setColumns: (columns: Column[]) => void;
  setCards: (cards: Card[]) => void;
  moveCardLocal: (
    cardId: string,
    newColumnId: string,
    newPosition: number,
  ) => void;
  addCardLocal: (card: Card) => void;
  removeCardLocal: (cardId: string) => void;
  addColumnLocal: (column: Column) => void;
  removeColumnLocal: (columnId: string) => void;
  updateCardTitleLocal: (cardId: string, title: string) => void;
  updateColumnTitleLocal: (columnId: string, title: string) => void;
  updateCardDescriptionLocal: (cardId: string, description: string) => void
  updateCardLabelLocal: (cardId: string, labelColor: string | null) => void
};

export const useBoardStore = create<BoardState>((set) => ({
  columns: [],
  cards: [],
  setColumns: (columns) => set({ columns }),
  setCards: (cards) => set({ cards }),
  moveCardLocal: (cardId, newColumnId, newPosition) =>
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === cardId
          ? { ...c, column_id: newColumnId, position: newPosition }
          : c,
      ),
    })),
  addCardLocal: (card) => set((state) => ({ cards: [...state.cards, card] })),
  removeCardLocal: (cardId) =>
    set((state) => ({ cards: state.cards.filter((c) => c.id !== cardId) })),
  addColumnLocal: (column) =>
    set((state) => ({ columns: [...state.columns, column] })),
  removeColumnLocal: (columnId) =>
    set((state) => ({
      columns: state.columns.filter((c) => c.id !== columnId),
      cards: state.cards.filter((c) => c.column_id !== columnId), // کارت‌های اون ستون هم پاک شن
    })),
    updateCardTitleLocal: (cardId, title) =>
  set((state) => ({
    cards: state.cards.map((c) => (c.id === cardId ? { ...c, title } : c)),
  })),
updateColumnTitleLocal: (columnId, title) =>
  set((state) => ({
    columns: state.columns.map((c) => (c.id === columnId ? { ...c, title } : c)),
  })),
  updateCardDescriptionLocal: (cardId, description) =>
  set((state) => ({
    cards: state.cards.map((c) =>
      c.id === cardId ? { ...c, description } : c
    ),
  })),
  updateCardLabelLocal: (cardId, labelColor) =>
  set((state) => ({
    cards: state.cards.map((c) =>
      c.id === cardId ? { ...c, label_color: labelColor } : c
    ),
  })),
}));
