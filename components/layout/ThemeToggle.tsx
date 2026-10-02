'use client'

import { MoonIcon, SunIcon } from '@/components/ui/icons'
import { useTheme } from './ThemeProvider'

const OPTIONS = [
  { value: 'light', label: 'تم روشن', Icon: SunIcon },
  { value: 'dark', label: 'تم تاریک', Icon: MoonIcon },
] as const

/**
 * کلید دو‌حالتهٔ تم (روشن | تاریک). هر دو گزینه همیشه دیده می‌شوند و حالت
 * فعلی روشن است، نه فقط آیکنِ حالت جاری؛ پس کاربر بدون حدس‌زدن می‌فهمد
 * کجاست و با یک کلیک به هر دو می‌رود. `aria-pressed` وضعیت را برای
 * screen reader هم می‌گوید.
 */
export default function ThemeToggle() {
  const { resolved, setTheme } = useTheme()

  return (
    <div
      role="group"
      aria-label="تم رنگی"
      className="flex items-center rounded-full border border-border bg-surface-2 p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = resolved === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={isActive}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={[
              'flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150',
              'outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              isActive
                ? 'bg-surface text-text shadow-xs'
                : 'text-text-muted hover:text-text',
            ].join(' ')}
          >
            <Icon size={15} />
          </button>
        )
      })}
    </div>
  )
}
