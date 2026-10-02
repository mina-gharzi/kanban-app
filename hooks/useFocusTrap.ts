'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { lockBodyScroll } from '@/lib/scrollLock'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** کنترل‌های واقعاً قابل فوکوس درون یک ظرف. */
function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement
  )
}

export type FocusTrapOptions = {
  /** تا وقتی `false` است هیچ رفتاری اعمال نمی‌شود. */
  active: boolean
  containerRef: RefObject<HTMLElement | null>
  /** عنصری که باید فوکوس اولیه بگیرد؛ وگرنه اولین کنترل، وگرنه خود ظرف. */
  initialFocusRef?: RefObject<HTMLElement | null>
  /** با Escape چه شود. اگر داده نشود، Escape به لایه‌ی بالاتر می‌رسد. */
  onEscape?: () => void
  /** فوکوس را به عنصری که trap را باز کرده برگردان. */
  returnFocus?: boolean
  /** اسکرول body را قفل کن (برای drawer/overlay تمام‌صفحه). */
  lockScroll?: boolean
}

/**
 * رفتار دسترس‌پذیر یک لایه‌ی modal: نگه‌داشتن Tab داخل ظرف، فوکوس اولیه،
 * Escape و بازگرداندن فوکوس به همان جایی که از آن باز شده.
 *
 * Escape عمداً با ظرف‌های تودرتو هماهنگ است: اگر کلید از داخل دیالوگ
 * بالاتری (Modal/منو) آمده باشد، این لایه دست نمی‌زند تا آن لایه خودش
 * بسته شود. به همین دلیل شنونده در فاز `capture` روی `document` است.
 */
export function useFocusTrap({
  active,
  containerRef,
  initialFocusRef,
  onEscape,
  returnFocus = true,
  lockScroll = false,
}: FocusTrapOptions) {
  // callback‌ها در ref نگه داشته می‌شوند تا اثر فقط با `active` عوض شود؛
  // وگرنه هر رندر دوباره trap را می‌شکند و فوکوس را پس می‌دهد. ref فقط
  // داخل اثر به‌روز می‌شود (نه حین رندر) و چون این اثر قبل از اثر اصلی
  // تعریف شده، شنونده همیشه آخرین نسخه را می‌بیند.
  const onEscapeRef = useRef(onEscape)
  const initialFocusRefHolder = useRef(initialFocusRef)

  useEffect(() => {
    onEscapeRef.current = onEscape
    initialFocusRefHolder.current = initialFocusRef
  })

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const unlockScroll = lockScroll ? lockBodyScroll() : null

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        const close = onEscapeRef.current
        if (!close) return
        // اگر یک dialog بالاتر این کلید را دارد، اجازه می‌دهیم خودش مدیریت کند
        const owner =
          event.target instanceof Element
            ? event.target.closest('[role="dialog"]')
            : null
        if (owner && owner !== container) return
        event.preventDefault()
        event.stopPropagation()
        close()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = getFocusable(container!)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      const current = document.activeElement
      // اگر فوکوس از ظرف بیرون رفته باشد (کلیک روی backdrop، تغییر تب و…)
      // همین‌جا به داخل برش می‌گردانیم.
      const isInside = current === container || container!.contains(current)

      if (!isInside) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
        return
      }
      if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && (current === first || current === container)) {
        event.preventDefault()
        last.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    const target =
      initialFocusRefHolder.current?.current ?? getFocusable(container)[0] ?? container
    target.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      unlockScroll?.()
      // اگر عنصر trigger هنوز در DOM باشد فوکوس برمی‌گردد؛ وگرنه بدون خطا رد می‌شویم
      if (returnFocus && previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [active, containerRef, lockScroll, returnFocus])
}
