import { useToastStore } from '@/store/toastStore'

/**
 * سیاست یکپارچه گزارش خطا: پیام قابل فهم برای کاربر + لاگ برای دیباگ.
 * جایگزین try/catch های تکراری با console.error در کامپوننت‌ها.
 */
export function notifyError(message: string, error?: unknown): void {
  if (error !== undefined) {
    console.error(`[kanban] ${message}`, error)
  }
  useToastStore.getState().addToast(message)
}
