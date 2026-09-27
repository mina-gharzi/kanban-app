'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type MenuItem = {
  label: string
  onSelect: () => void
  icon?: ReactNode
  /** آیتم مخرب (حذف) با رنگ و فاصله‌ی جدا مشخص می‌شود */
  tone?: 'default' | 'danger'
  disabled?: boolean
}

type Props = {
  /** محرک منو؛ معمولاً یک IconButton با `⋯` */
  trigger: (props: {
    ref: React.Ref<HTMLButtonElement>
    onClick: () => void
    'aria-haspopup': 'menu'
    'aria-expanded': boolean
    'aria-controls': string
  }) => ReactNode
  items: MenuItem[]
  /** نام دسترس‌پذیر برای منو */
  label: string
  align?: 'start' | 'end'
}

const TONES = {
  default: 'text-text hover:bg-surface-2 focus:bg-surface-2',
  danger: 'text-danger hover:bg-danger-soft focus:bg-danger-soft',
} as const

/**
 * منوی بازشو با رفتار کامل کیبورد:
 *   ↑/↓ و Home/End جابه‌جایی، Enter/Space اجرا، Escape بستن + بازگرداندن فوکوس،
 *   کلیک بیرون بستن، و `role="menu"` با مدیریت `aria-expanded`.
 *
 * به‌جای دوختن focus با `tabIndex` منفی، خود آیتم فوکوس می‌گیرد تا
 * screen reader هر بار همان آیتم را از نو نخواند.
 */
export default function Dropdown({ trigger, items, label, align = 'end' }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const menuId = useId()

  const enabledIndexes = items
    .map((item, index) => (item.disabled ? -1 : index))
    .filter((index) => index !== -1)

  const focusItem = useCallback(
    (index: number) => {
      const next = enabledIndexes[index]
      if (next === undefined) return
      setActiveIndex(next)
      itemRefs.current[next]?.focus()
    },
    [enabledIndexes]
  )

  const close = useCallback(
    (returnFocus: boolean) => {
      setIsOpen(false)
      if (returnFocus) triggerRef.current?.focus()
    },
    []
  )

  // کلیک بیرون از منو می‌بنددش
  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (menuRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  function openMenu(focusFirst: boolean) {
    setIsOpen(true)
    if (focusFirst) setActiveIndex(enabledIndexes[0] ?? 0)
  }

  function handleMenuKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusItem((enabledIndexes.indexOf(activeIndex) + 1) % enabledIndexes.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusItem(
          (enabledIndexes.indexOf(activeIndex) - 1 + enabledIndexes.length) %
            enabledIndexes.length
        )
        break
      case 'Home':
        event.preventDefault()
        focusItem(0)
        break
      case 'End':
        event.preventDefault()
        focusItem(enabledIndexes.length - 1)
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        close(true)
        break
      case 'Tab':
        close(false)
        break
    }
  }

  return (
    <div className="relative">
      {trigger({
        ref: triggerRef,
        onClick: () => (isOpen ? close(false) : openMenu(false)),
        'aria-haspopup': 'menu',
        'aria-expanded': isOpen,
        'aria-controls': menuId,
      })}

      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className={[
            'absolute z-40 mt-1 min-w-44 rounded-lg border border-border',
            'bg-surface p-1 shadow-md',
            align === 'end' ? 'end-0' : 'start-0',
          ].join(' ')}
        >
          {items.map((item, index) => (
            <button
              key={item.label}
              ref={(element) => {
                itemRefs.current[index] = element
              }}
              role="menuitem"
              type="button"
              disabled={item.disabled}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => {
                close(true)
                item.onSelect()
              }}
              onFocus={() => setActiveIndex(index)}
              className={[
                'flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2',
                'text-start text-[13px] transition-colors duration-100',
                'disabled:pointer-events-none disabled:opacity-50',
                TONES[item.tone ?? 'default'],
              ].join(' ')}
            >
              {item.icon && (
                <span className="shrink-0 opacity-80">{item.icon}</span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
