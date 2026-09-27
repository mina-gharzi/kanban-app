import type { ButtonHTMLAttributes, Ref } from 'react'
import { Spinner } from './Spinner'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'dangerGhost'

export type ButtonSize = 'sm' | 'md'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-hover shadow-xs',
  secondary:
    'bg-surface text-text border border-border hover:bg-surface-2 hover:border-border-2 active:bg-surface-3',
  ghost: 'text-text-2 hover:bg-surface-2 hover:text-text active:bg-surface-3',
  danger: 'bg-danger text-white hover:brightness-110 active:brightness-95 shadow-xs',
  dangerGhost: 'text-danger hover:bg-danger-soft active:brightness-95',
}

const SIZES: Record<ButtonSize, string> = {
  // ارتفاع یکسان (۳۶px) برای همه‌ی اندازه‌ها تا هم‌ترازی در Rowها حفظ شود
  sm: 'h-9 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
}

/**
 * استایل مشترک دکمه‌ها. جدا export شده تا `<Link>` و `<button>` دقیقاً
 * یک ظاهر داشته باشند بدون اینکه مجبور به polymorphic component شویم.
 */
export function buttonClass(options?: {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
}): string {
  const { variant = 'secondary', size = 'md', fullWidth, className = '' } = options ?? {}
  return [
    'inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap',
    'transition-colors duration-150 select-none',
    'disabled:opacity-55 disabled:pointer-events-none',
    VARIANTS[variant],
    SIZES[size],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  /** نمایش Spinner داخلی و غیرفعال‌کردن دکمه هنگام انجام عملیات */
  loading?: boolean
  /** برای فوکوس برنامه‌ریزی‌شده (مثل دکمه‌ی پیش‌فرض ConfirmDialog) */
  ref?: Ref<HTMLButtonElement>
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  fullWidth,
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, fullWidth, className })}
      {...props}
    >
      {loading && <Spinner size={size === 'sm' ? 13 : 15} />}
      {children}
    </button>
  )
}
