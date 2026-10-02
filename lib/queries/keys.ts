/**
 * کلیدهای کوئری در یک جا جمع شده‌اند تا هیچ کلیدی hard-code نشود.
 * الگو: ['boards'] و ['board', boardId]
 *
 * درباره‌ی mutationKey: در TanStack Query تطبیق کلید به‌صورت prefix-based است
 * (partialMatchKey). یعنی فیلتر `['board', boardId]` هر mutation ای را پیدا می‌کند
 * که کلیدش با این پیشوند شروع می‌شود. از همین ویژگی برای شمارش «mutationهای در جریان
 * این بورد» استفاده می‌شود؛ پس scope باید عمداً کوتاه‌تر از کلید دقیق باشد.
 */
export const queryKeys = {
  boards: ['boards'] as const,

  // اشتراک‌گذاری: عمداً زیر ['board', id] نیست تا invalidateِ داده‌ی بورد و scope
  // mutationها (که با پیشوند ['board', id] تطبیق می‌خورند) با آن‌ها قاطی نشود
  boardMembers: (boardId: string) => ['board-members', boardId] as const,
  boardInvites: (boardId: string) => ['board-invites', boardId] as const,
  myInvites: ['my-invites'] as const,
  board: (boardId: string) => ['board', boardId] as const,

  /** پیشوند مشترک همه‌ی mutationهای یک بورد. برای شمارش/فیلتر pending استفاده می‌شود. */
  boardMutationScope: (boardId: string) => ['board', boardId] as const,

  /**
   * کلید دقیق هر نوع mutation.
   * 'card' | 'column' برای تغییر محتوای بورد، 'board' برای خود بورد.
   */
  boardMutation: (boardId: string, entity: 'card' | 'column' | 'board') =>
    ['board', boardId, entity] as const,
}
