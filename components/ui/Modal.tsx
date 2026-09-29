'use client'

import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react'
import { IconButton } from './IconButton'
import { XIcon } from './icons'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

type Props = {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  /** نوار کنش پایین؛ معمولاً Cancel + Primary */
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** بستن با کلیک روی پس‌زمینه (برای دیالوگ‌های غیرمخرب) */
  closeOnBackdrop?: boolean
  /**
   * غیرفعال‌کردن تمام راه‌های بستن (X، Escape، پس‌زمینه).
   * برای فرم‌هایی که در حال ذخیره‌اند: تا پایان mutation بسته نمی‌شوند تا
   * کاربر با یک کلیک تصادفی، وضعیت فرمِ در حال ارسال را رها نکند.
   */
  dismissible?: boolean
  /** عنصری که باید هنگام باز شدن فوکوس بگیرد؛ پیش‌فرض: اولین کنترل */
  initialFocusRef?: React.RefObject<HTMLElement | null>
  className?: string
}

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
} as const

/**
 * Dialog واقعی با رفتار دسترس‌پذیر کامل:
 *   • focus trap (Tab و Shift+Tab داخل dialog می‌مانند)
 *   • فوکوس اولیه روی اولین کنترل
 *   • Escape برای بستن
 *   • بازگرداندن فوکوس به همان عنصری که dialog را باز کرده بود
 *   • قفل اسکرول صفحه‌ی پشت
 *   • `aria-modal` + اتصال label/description با id
 */
export default function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  dismissible = true,
  initialFocusRef,
  className = '',
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  // بستن با Escape + نگه‌داشتن Tab داخل dialog
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // در حالت غیرقابل‌بستن، Escape هم نباید کاری کند
        if (!dismissible) return
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((element) => element.offsetParent !== null || element === document.activeElement)

      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      const active = document.activeElement
      if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault()
        last.focus()
      }
    },
    [dismissible, onClose]
  )

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown, true)

    // فوکوس اولیه: عنصر اعلام‌شده، وگرنه اولین کنترل، وگرنه خود panel
    const target =
      initialFocusRef?.current ??
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
      panelRef.current
    target?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.body.style.overflow = overflow
      previouslyFocused?.focus()
    }
  }, [handleKeyDown, initialFocusRef])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (dismissible && closeOnBackdrop && event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={[
          'flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface',
          'rounded-t-xl border border-border shadow-lg outline-none',
          'animate-[modal-in_180ms_var(--ease-out-soft)] sm:rounded-xl',
          SIZES[size],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-heading font-semibold text-text">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-meta text-text-2">
                {description}
              </p>
            )}
          </div>
          <IconButton
            label="بستن"
            size="sm"
            onClick={onClose}
            disabled={!dismissible}
            className="-me-1.5 -mt-1"
          >
            <XIcon size={17} />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          // پس‌زمینه‌ی نوار کنش همان `surface` می‌ماند و جدا شدن با
          // `border-t` انجام می‌شود. `surface-2` در این سیستم معنای
          // «بدنهٔ ستون» دارد و استفاده از آن اینجا یک نوار خاکستریِ
          // بی‌معنا داخل مودال می‌ساخت (الگوی «هر چیز یک کارت»).
          <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface px-5 py-3.5">
            {footer}
          </footer>
        )}
      </div>

      <style>{`@keyframes modal-in{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}`}</style>
    </div>
  )
}
