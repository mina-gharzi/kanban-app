import { AppError } from '@/lib/errors/AppError'
import { ERROR_CODES } from '@/lib/errors/errorCodes'
import { boardExists, getBoardData } from '@/lib/supabase/queries'
import type { BoardData } from '@/lib/board/types'

/**
 * داده‌ی بورد را می‌خواند و «بورد تازه‌ی خالی» را از «بوردِ ناموجود یا
 * بدون دسترسی» جدا می‌کند.
 *
 * برای بوردی که RLS پنهانش کرده، `getBoardData` همان `{ columns: [], cards: [] }`
 * را برمی‌گرداند که برای یک بورد خالیِ در دسترس هم درست است. این دو فقط وقتی
 * بورد هیچ ستونی ندارد از هم قابل‌تفکیک‌اند؛ پس بررسی وجود عمداً فقط در همان
 * حالت و با یک درخواستِ سبک انجام می‌شود و برای بوردهای معمولی هیچ هزینه‌ی
 * اضافه‌ای ندارد.
 *
 * خطاهای `getBoardData` یا `boardExists` (شبکه/دیتابیس) دست‌نخورده بالا
 * می‌روند و هرگز به NOT_FOUND تبدیل نمی‌شوند.
 */
export async function loadBoardData(boardId: string): Promise<BoardData> {
  const data = await getBoardData(boardId)
  if (data.columns.length > 0) return data
  if (await boardExists(boardId)) return data

  throw new AppError({
    code: ERROR_CODES.NOT_FOUND,
    message: 'loadBoardData: board is missing or not visible to the current user',
    userMessage: 'این بورد وجود ندارد یا به آن دسترسی ندارید.',
    retryable: false,
  })
}
