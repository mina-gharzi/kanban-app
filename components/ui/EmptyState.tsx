import type { ReactNode } from 'react'

type Props = {
  icon: ReactNode
  title: string
  description?: string
  /** کنش اصلی برای خروج از حالت خالی */
  action?: ReactNode
  /** ارتفاع کمینه تا صفحه لود و خالی، ارتفاع یکسان داشته باشند */
  minHeight?: string
  className?: string
}

/**
 * حالت خالی. قاعده: عنوان می‌گوید چه چیزی نیست، توضیح می‌گوید چه‌کار کنیم،
 * و یک کنش واقعی می‌دهد. Illustration سنگین ندارد — آیکون کافی است.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  minHeight = '12rem',
  className = '',
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 px-6 text-center ${className}`}
      style={{ minHeight }}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-text-muted">
        {icon}
      </span>
      <div className="space-y-1">
        <p className="text-body font-medium text-text">{title}</p>
        {description && (
          <p className="mx-auto max-w-xs text-meta text-text-2">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
