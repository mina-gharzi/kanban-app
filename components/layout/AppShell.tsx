'use client'

import { useEffect, useState, type ReactNode } from 'react'
import AppHeader from './AppHeader'
import { XIcon } from '@/components/ui/icons'
import { IconButton } from '@/components/ui/IconButton'

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

  // بستن drawer با Escape
  useEffect(() => {
    if (!isNavOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsNavOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isNavOpen])

  const closeNav = () => setIsNavOpen(false)

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <AppHeader
        onToggleNav={
          sidebar ? () => setIsNavOpen((open) => !open) : undefined
        }
        isNavOpen={isNavOpen}
        meta={headerMeta}
      />

      <div className="flex min-h-0 flex-1">
        {sidebar && (
          <>
            {/* ثابت در دسکتاپ */}
            <aside className="hidden w-64 shrink-0 overflow-y-auto border-e border-border bg-surface lg:block">
              {sidebar({ onNavigate: () => {} })}
            </aside>

            {/* drawer در موبایل و تبلت */}
            {isNavOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-overlay lg:hidden"
                  onClick={closeNav}
                  aria-hidden="true"
                />
                <aside
                  aria-label="فهرست بوردها"
                  className="fixed inset-y-0 start-0 z-50 w-72 max-w-[85vw] overflow-y-auto border-e border-border bg-surface shadow-lg lg:hidden"
                >
                  <SidebarHeader onClose={closeNav} />
                  {sidebar({ onNavigate: closeNav })}
                </aside>
              </>
            )}
          </>
        )}

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

function SidebarHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
      <span className="text-[15px] font-semibold text-text">بوردها</span>
      <IconButton label="بستن فهرست" size="sm" onClick={onClose}>
        <XIcon size={17} />
      </IconButton>
    </div>
  )
}
