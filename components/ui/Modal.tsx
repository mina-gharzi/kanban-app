'use client'

import { useId, useRef, type ReactNode } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { IconButton } from './IconButton'
import { XIcon } from './icons'

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

  // Escape، تله‌ی فوکوس، قفل اسکرول و بازگرداندن فوکوس همه در useFocusTrap‌اند:
  //  • handlerها با ref پایدارند؛ `onClose` جدید در هر رندرِ والد (مثلاً با هر
  //    رویداد realtime) دیگر افکت را از نو اجرا نمی‌کند و فوکوسِ کاربر وسط
  //    تایپ دزدیده نمی‌شود.
  //  • فقط بالاترین مودالِ تو‌در‌تو به Escape جواب می‌دهد.
  //  • قفل اسکرول شمارنده‌دار است.
  useFocusTrap({
    active: true,
    containerRef: panelRef,
    initialFocusRef,
    onEscape: dismissible ? onClose : undefined,
    lockScroll: true,
  })

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
