import { supabase } from '@/lib/supabase/client'
import { AppError } from '@/lib/errors/AppError'
import { ERROR_CODES } from '@/lib/errors/errorCodes'
import { normalizeError } from '@/lib/errors/normalizeError'
import { accountErrorMessage } from '@/lib/account/errors'
import { buildAccountExport } from '@/lib/account/export'
import { getBoardData, getBoards } from '@/lib/supabase/queries'

export type SharedBoardPreview = {
  board_id: string
  title: string
  members: number
  new_owner_email: string | null
}

export type DeletionPreview = {
  solo_boards: number
  shared_boards: SharedBoardPreview[]
  memberships: number
}

export type SharedBoardsPolicy = 'transfer' | 'delete'

function toAccountError(error: { message: string; code?: string }): AppError {
  const userMessage = accountErrorMessage(error.message)
  if (userMessage) {
    return new AppError({
      code: error.code === '28P01' ? ERROR_CODES.VALIDATION : ERROR_CODES.AUTHORIZATION,
      message: error.message,
      userMessage,
      retryable: false,
    })
  }
  return normalizeError(error)
}

export async function getDeletionPreview(): Promise<DeletionPreview> {
  const { data, error } = await supabase.rpc('account_deletion_preview')
  if (error) throw toAccountError(error)
  return data as DeletionPreview
}

/**
 * حذف حساب. رمز دوباره در خودِ دیتابیس سنجیده می‌شود (نه فقط در مرورگر).
 * بعد از موفقیت، نشستِ محلی هم پاک می‌شود (سرور دیگر کاربری با آن توکن ندارد).
 */
export async function deleteMyAccount(password: string, sharedBoards: SharedBoardsPolicy): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account', {
    p_password: password,
    p_shared_boards: sharedBoards,
  })
  if (error) throw toAccountError(error)
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
}

/** همه‌ی بوردهایی که کاربر به آن‌ها دسترسی دارد، به‌صورت یک شیء JSON قابل‌دانلود */
export async function exportMyData() {
  const { data: sessionData } = await supabase.auth.getSession()
  const email = sessionData.session?.user.email ?? ''
  const boards = await getBoards()
  const withData = await Promise.all(
    boards.map(async (board) => ({
      id: board.id,
      title: board.title,
      created_at: board.created_at,
      role: board.role ?? 'viewer',
      data: await getBoardData(board.id),
    })),
  )
  return buildAccountExport({ email, exportedAt: new Date(), boards: withData })
}
