import { supabase } from '@/lib/supabase/client'
import { AppError } from '@/lib/errors/AppError'
import { ERROR_CODES } from '@/lib/errors/errorCodes'
import { normalizeError } from '@/lib/errors/normalizeError'
import { sharingErrorMessage } from '@/lib/sharing/errors'
import type { InviteRole } from '@/lib/sharing/roles'

export type BoardMember = {
  user_id: string
  email: string
  role: InviteRole
  created_at: string
}

/** دعوتِ ارسال‌شده (مالک می‌بیند) */
export type SentInvite = {
  id: string
  email: string
  role: InviteRole
  created_at: string
}

/** دعوتِ دریافتی (دعوت‌شده می‌بیند) */
export type ReceivedInvite = {
  id: string
  board_id: string
  board_title: string
  role: InviteRole
  invited_by_email: string | null
  created_at: string
}

/** خطای RPC را اگر شناخته‌شده بود به پیام فارسی دقیق تبدیل می‌کند */
function toSharingError(error: { message: string; code?: string }): AppError {
  const userMessage = sharingErrorMessage(error.message)
  if (userMessage) {
    const code =
      error.code === '42501' ? ERROR_CODES.AUTHORIZATION
      : error.code === '23505' ? ERROR_CODES.CONFLICT
      : ERROR_CODES.VALIDATION
    return new AppError({ code, message: error.message, userMessage, retryable: false })
  }
  return normalizeError(error)
}

function assertAffected(rows: unknown[] | null, what: string) {
  if (!rows || rows.length === 0) {
    throw new AppError({
      code: ERROR_CODES.NOT_FOUND,
      message: `${what}: no row affected (missing or not permitted)`,
      userMessage: 'این مورد پیدا نشد یا اجازه‌ی تغییرش را ندارید.',
      retryable: false,
    })
  }
}

export async function getBoardMembers(boardId: string): Promise<BoardMember[]> {
  const { data, error } = await supabase
    .from('board_members')
    .select('user_id, email, role, created_at')
    .eq('board_id', boardId)
    .order('created_at')
  if (error) throw normalizeError(error)
  return (data ?? []) as BoardMember[]
}

export async function getSentInvites(boardId: string): Promise<SentInvite[]> {
  const { data, error } = await supabase
    .from('board_invites')
    .select('id, email, role, created_at')
    .eq('board_id', boardId)
    .order('created_at')
  if (error) throw normalizeError(error)
  return (data ?? []) as SentInvite[]
}

/**
 * دعوت‌های دریافتیِ من. مالک‌ها دعوت‌های بوردِ خودشان را هم می‌بینند، پس با
 * ایمیل خودم فیلتر می‌شود. (دعوت فقط به ایمیل تأییدشده تحویل می‌شود؛ RLS
 * برای کاربرِ تأییدنشده چیزی برنمی‌گرداند.)
 */
export async function getReceivedInvites(): Promise<ReceivedInvite[]> {
  const { data: sessionData } = await supabase.auth.getSession()
  const email = sessionData.session?.user.email?.toLowerCase()
  if (!email) return []

  const { data, error } = await supabase
    .from('board_invites')
    .select('id, board_id, board_title, role, invited_by_email, created_at')
    .eq('email', email)
    .order('created_at', { ascending: false })
  if (error) throw normalizeError(error)
  return (data ?? []) as ReceivedInvite[]
}

export async function inviteToBoard(boardId: string, email: string, role: InviteRole) {
  const { error } = await supabase.rpc('invite_to_board', {
    p_board_id: boardId,
    p_email: email,
    p_role: role,
  })
  if (error) throw toSharingError(error)
}

export async function acceptInvite(inviteId: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_board_invite', { p_invite_id: inviteId })
  if (error) throw toSharingError(error)
  return data as string
}

/** رد کردن (دعوت‌شده) یا لغو (مالک): هر دو یک DELETE زیر RLS‌اند */
export async function deleteInvite(inviteId: string) {
  const { data, error } = await supabase.from('board_invites').delete().eq('id', inviteId).select('id')
  if (error) throw normalizeError(error)
  assertAffected(data, 'deleteInvite')
}

export async function setMemberRole(boardId: string, userId: string, role: InviteRole) {
  const { data, error } = await supabase
    .from('board_members')
    .update({ role })
    .eq('board_id', boardId)
    .eq('user_id', userId)
    .select('user_id')
  if (error) throw normalizeError(error)
  assertAffected(data, 'setMemberRole')
}

/** حذف عضو (مالک) یا ترک بورد (خودِ عضو)؛ هر دو یک DELETE زیر RLS‌اند */
export async function removeMember(boardId: string, userId: string) {
  const { data, error } = await supabase
    .from('board_members')
    .delete()
    .eq('board_id', boardId)
    .eq('user_id', userId)
    .select('user_id')
  if (error) throw normalizeError(error)
  assertAffected(data, 'removeMember')
}
