/**
 * کلیدهای کوئری در یک جا جمع شده‌اند تا هیچ کلیدی hard-code نشود.
 * الگو: ['boards'] و ['board', boardId]
 */
export const queryKeys = {
  boards: ['boards'] as const,
  board: (boardId: string) => ['board', boardId] as const,
}
