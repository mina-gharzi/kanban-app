import Link from 'next/link'
import EmptyState from '@/components/ui/EmptyState'
import { buttonClass } from '@/components/ui/Button'
import { BoardsIcon } from '@/components/ui/icons'

/**
 * بوردی که وجود ندارد، حذف شده، یا برای کاربر جاری قابل‌دیدن نیست.
 *
 * عمداً از حالت خالی بورد (بورد در دسترس ولی بدون ستون) جدا است: پیام و
 * کنش این دو یکی نیست. اینجا راه خروج فقط بازگشت به فهرست بوردهاست.
 */
export default function BoardNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-2 shadow-sm">
        <EmptyState
          icon={<BoardsIcon size={22} />}
          title="این بورد پیدا نشد"
          description="این بورد وجود ندارد، حذف شده است، یا به آن دسترسی ندارید."
          action={
            <Link
              href="/boards"
              className={buttonClass({ variant: 'secondary', size: 'md' })}
            >
              بازگشت به بوردها
            </Link>
          }
        />
      </div>
    </div>
  )
}
