/** نقش کاربر روی یک بورد. `owner` همان `boards.created_by` است؛ بقیه از `board_members`. */
export type BoardRole = 'owner' | 'editor' | 'viewer'
export type InviteRole = Exclude<BoardRole, 'owner'>

export const ROLE_LABELS: Record<BoardRole, string> = {
  owner: 'مالک',
  editor: 'ویرایشگر',
  viewer: 'فقط‌خواندنی',
}

export const ROLE_DESCRIPTIONS: Record<InviteRole, string> = {
  editor: 'می‌تواند ستون و کارت بسازد، ویرایش و جابه‌جا کند.',
  viewer: 'فقط می‌تواند بورد را ببیند.',
}

export type BoardPermissions = {
  role: BoardRole
  /** ساخت/ویرایش/جابه‌جایی/حذف ستون و کارت */
  canEdit: boolean
  /** تغییر نام و حذف بورد، دعوت و مدیریت اعضا */
  isOwner: boolean
}

export function permissionsFor(role: BoardRole): BoardPermissions {
  return { role, canEdit: role !== 'viewer', isOwner: role === 'owner' }
}

/**
 * نقش من روی یک بورد. این فقط برای نمایش رابط است؛ مرجع واقعی دسترسی RLS
 * دیتابیس است. اگر عضویت پیدا نشد (مثلاً هم‌زمان با حذف شدن)، محتاط‌ترین نقش
 * یعنی viewer برمی‌گردد، نه owner.
 */
export function resolveBoardRole(
  board: { created_by?: string | null },
  userId: string,
  membershipRole: InviteRole | undefined,
): BoardRole {
  if (board.created_by && board.created_by === userId) return 'owner'
  return membershipRole ?? 'viewer'
}
