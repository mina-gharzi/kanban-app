'use client'

import IconButton from '@/components/ui/IconButton'
import { MoonIcon, SunIcon } from '@/components/ui/icons'
import { useTheme } from './ThemeProvider'

/**
 * کلید تعویض تم.
 *
 * آیکون و برچسبِ «تمِ مقابل» را نشان می‌دهد (الگوی رایج: وقتی روشن
 * است، آیکون ماه را می‌بینید تا بدانید کلیک چه می‌کند). `aria-pressed`
 * استفاده نشده چون برچسب با هر کلیک عوض می‌شود؛ داشتن هر دو با هم
 * متناقض است و screen-reader وضعیت غلط اعلام می‌کند.
 */
export default function ThemeToggle() {
  const { resolved, setTheme } = useTheme()
  const next = resolved === 'dark' ? 'light' : 'dark'

  return (
    <IconButton
      label={next === 'dark' ? 'فعال‌کردن تم تاریک' : 'فعال‌کردن تم روشن'}
      onClick={() => setTheme(next)}
    >
      {resolved === 'dark' ? <MoonIcon size={17} /> : <SunIcon size={17} />}
    </IconButton>
  )
}
