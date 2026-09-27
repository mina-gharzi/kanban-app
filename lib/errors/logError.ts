import type { AppError } from './AppError'

/**
 * لاگ ساختارمند خطا.
 *
 * سیاست: در production فقط کد، فیلد و عملیات لاگ می‌شود؛ متن خطای خام
 * می‌تواند جزئیات دیتابیس یا داده‌ی حساس داشته باشد. در development
 * متن کامل به‌همراه cause برای دیباگ چاپ می‌شود.
 *
 * @param operation نام عملیاتی که خطا در آن رخ داده، مثل 'card.create'
 */
export function logError(error: AppError, operation?: string): void {
  if (process.env.NODE_ENV === 'production') {
    console.error('[kanban]', {
      code: error.code,
      operation,
      field: error.field,
      status: error.status,
    })
    return
  }

  console.error('[kanban]', {
    code: error.code,
    message: error.message,
    userMessage: error.userMessage,
    operation,
    field: error.field,
    status: error.status,
    retryable: error.retryable,
    cause: error.cause,
  })
}
