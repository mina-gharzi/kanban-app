'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import AppHeader from './AppHeader'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { XIcon } from '@/components/ui/icons'
import { IconButton } from '@/components/ui/IconButton'

/** هم‌تراز با breakpoint `lg` در Tailwind؛ جابه‌جایی drawer در این نقطه بی‌معنی است. */
const DESKTOP_QUERY = '(min-width: 1024px)'

type SidebarRender = (props: { onNavigate: () => void }) => ReactNode

type Props = {
  /** نوار کناری؛ در دسکتاپ ثابت و در موبایل drawer */
  sidebar?: SidebarRender
  /** محتوای ناحیه‌ی عنوان در هدر (مثل نام بورد جاری) */
  headerMeta?: ReactNode
  children: ReactNode
}

/**
 * پوسته‌ی اپ: Header + Sidebar + Main.
 *
 * Sidebar در `lg` و بالاتر همیشه دیده می‌شود و در کوچک‌تر به یک
 * drawer off-canvas تبدیل می‌شود. فشرده‌کردن همه‌ی ستون‌های بورد در عرض
 * کم تجربه‌ی موبایل را خراب می‌کند، پس نوار کناری راه درست است.
 *
 * `h-dvh + overflow-hidden` باعث می‌شود فقط ناحیه‌ی محتوا اسکرول شود و
 * هدر همیشه سرِ جایش بماند.
 */
export default function AppShell({ sidebar, headerMeta, children }: Props) {
  const [isNavOpen, setIsNavOpen] = useState(false)
  const drawerId = useId()
  const drawerRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Escape و focus trap داخل useFocusTrap مدیریت می‌شود تا با Modalهای
  // تودرتو تداخل نکند (لایه‌ی بالاتر اولویت دارد).
  useFocusTrap({
    active: isNavOpen && Boolean(sidebar),
    containerRef: drawerRef,
    initialFocusRef: closeButtonRef,
    onEscape: () => setIsNavOpen(false),
    returnFocus: true,
    lockScroll: true,
  })

  // اگر کاربر drawer را باز کند و بعد عرض را به دسکتاپ ببرد، drawer با
  // `lg:hidden` نامرئی می‌شود ولی باز می‌ماند: فوکوس داخل یک ظرف
  // نامرئی گیر می‌کند و trigger هم دیده نمی‌شود. اینجا بسته می‌شود.
  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY)
    function handleChange(event: MediaQueryListEvent) {
      if (event.matches) setIsNavOpen(false)
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const closeNav = () => setIsNavOpen(false)

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg short:h-auto short:min-h-dvh short:overflow-visible">
      <AppHeader
        onToggleNav={
          sidebar ? () => setIsNavOpen((open) => !open) : undefined
        }
        isNavOpen={isNavOpen}
        navControlsId={sidebar ? drawerId : undefined}
        meta={headerMeta}
      />

      <div className="flex min-h-0 flex-1">
        {sidebar && (
          <>
            {/* ثابت در دسکتاپ. `hidden` یعنی display:none، پس در موبایل
                از درخت دسترس‌پذیری و از ترتیب Tab حذف می‌شود. */}
            <aside className="hidden w-64 shrink-0 overflow-y-auto border-e border-border bg-surface lg:block">
              {sidebar({ onNavigate: () => {} })}
            </aside>

            {/* drawer در موبایل و تبلت. تمام‌صفحه و focus-trapping است،
                پس از نظر رفتار یک dialog modal است. */}
            {isNavOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-overlay lg:hidden"
                  onClick={closeNav}
                  aria-hidden="true"
                />
                <aside
                  ref={drawerRef}
                  id={drawerId}
                  role="dialog"
                  aria-modal="true"
                  aria-label="فهرست بوردها"
                  className="fixed inset-y-0 start-0 z-50 w-72 max-w-[85vw] overflow-y-auto border-e border-border bg-surface shadow-lg outline-none lg:hidden"
                >
                  <SidebarHeader onClose={closeNav} closeButtonRef={closeButtonRef} />
                  {sidebar({ onNavigate: closeNav })}
                </aside>
              </>
            )}
          </>
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className="flex min-w-0 flex-1 flex-col overflow-hidden focus:outline-none short:overflow-visible"
        >
          {children}
        </main>
      </div>
    </div>
  )
}

function SidebarHeader({
  onClose,
  closeButtonRef,
}: {
  onClose: () => void
  closeButtonRef: React.Ref<HTMLButtonElement>
}) {
  return (
    <div className="flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
      <span className="text-subtitle font-semibold text-text">بوردها</span>
      <IconButton
        ref={closeButtonRef}
        label="بستن فهرست"
        size="sm"
        onClick={onClose}
      >
        <XIcon size={17} />
      </IconButton>
    </div>
  )
}
