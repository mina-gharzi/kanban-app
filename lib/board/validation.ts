import { AppError } from '@/lib/errors/AppError'
import { ERROR_CODES } from '@/lib/errors/errorCodes'

type TitleEntity = 'card' | 'column'

const ENTITY_LABELS: Record<TitleEntity, string> = {
  card: 'کارت',
  column: 'ستون',
}

const MAX_TITLE_LENGTH = 120

/**
 * اعتبارسنجی عنوان کارت/ستون.
 * خروجی یک AppError از نوع VALIDATION با field است تا فرم بتواند
 * پیام را کنار همان فیلد نشان دهد، نه به‌صورت toast عمومی.
 */
export function validateTitle(
  rawTitle: string,
  entity: TitleEntity
): AppError | null {
  const title = rawTitle.trim()

  if (!title) {
    return new AppError({
      code: ERROR_CODES.VALIDATION,
      message: `${entity} title must not be empty`,
      field: 'title',
      userMessage: `عنوان ${ENTITY_LABELS[entity]} نمی‌تواند خالی باشد.`,
    })
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return new AppError({
      code: ERROR_CODES.VALIDATION,
      message: `${entity} title must be at most ${MAX_TITLE_LENGTH} characters`,
      field: 'title',
      userMessage: `عنوان ${ENTITY_LABELS[entity]} حداکثر ${MAX_TITLE_LENGTH} کاراکتر است.`,
    })
  }

  return null
}
