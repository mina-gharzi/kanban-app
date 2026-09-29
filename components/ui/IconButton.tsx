import type { ButtonHTMLAttributes, Ref } from 'react'
import type { ButtonSize } from './Button'

// ارتفاع‌ها با Button هم‌تراز‌اند تا یک دکمه‌ی اصلی کنار یک IconButton
// در همان ردیف، لبه‌های هم‌سطح داشته باشند: sm = 36px, md = 40px.
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
}

const VARIANTS = {
  ghost: 'text-text-2 hover:bg-surface-2 hover:text-text active:bg-surface-3',
  subtle: 'text-text-2 bg-surface-2 hover:bg-surface-3 hover:text-text',
  dangerGhost: 'text-danger hover:bg-danger-soft active:bg-danger-soft',
} as const

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  /**
   * دکمه‌ی فقط-آیکون **باید** برچسب داشته باشد؛ بدون آن برای screen reader
   * و برای tooltip مرورگر بی‌نام است. اجباری است، نه اختیاری.
   */
  label: string
  variant?: keyof typeof VARIANTS
  size?: ButtonSize
  /** نمایش tooltip مرورگر */
  showTooltip?: boolean
  ref?: Ref<HTMLButtonElement>
}

/**
 * دکمه‌ی فقط-آیکون. `label` اجباری است تا هر آیکون یک نام دسترس‌پذیر داشته باشد.
 */
function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  showTooltip = true,
  className = '',
  type = 'button',
  children,
  ...props
}: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      title={showTooltip ? label : undefined}
      className={[
        'inline-flex items-center justify-center rounded-md shrink-0',
        'transition-colors duration-150',
        'disabled:opacity-55 disabled:pointer-events-none',
        SIZES[size],
        VARIANTS[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}

// هر دو شکل import پشتیبانی می‌شود تا در همه‌ی فایل‌ها یکدست بماند
export { IconButton }
export default IconButton
