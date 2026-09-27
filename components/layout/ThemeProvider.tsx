'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'kanban-theme'

type Snapshot = {
  theme: Theme
  /** تمِ واقعیِ اعمال‌شده؛ وقتی `theme` برابر `system` است از تنظیمات سیستم می‌آید */
  resolved: 'light' | 'dark'
}

type ThemeContextValue = Snapshot & {
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * تم یک «منبع بیرونی» است (localStorage + تنظیمات سیستم)، نه state
 * داخلی کامپوننت. پس با `useSyncExternalStore` خوانده می‌شود:
 * • در SSR یک snapshot ثابت برمی‌گردد، پس HTML سمت سرور و کلاینت یکی
 *   می‌شوند و hydration mismatch نمی‌دهد.
 * • نیازی به `setState` داخل effect نیست؛ فقط وقتی واقعاً عوض شود
 *   دوباره رندر می‌شود (به‌خاطر کشِ identity-پایدار پایین).
 */

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

/** snapshot سرور: تم پیش‌فرض، بدون دست‌زدن به `window`. */
const SERVER_SNAPSHOT: Snapshot = { theme: 'system', resolved: 'light' }

// کش تا `getSnapshot` هویت پایدار برگرداند؛ بدون آن حتی وقتی چیزی
// عوض نشده، useSyncExternalStore رندر بی‌دلیل می‌زند.
let cached: Snapshot | null = null

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : 'system'
  } catch {
    // حالت خصوصی مرورگر / بلوکه‌بودن storage
    return 'system'
  }
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

function computeSnapshot(): Snapshot {
  const theme = readStoredTheme()
  const resolved =
    theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme
  if (cached && cached.theme === theme && cached.resolved === resolved) {
    return cached
  }
  cached = { theme, resolved }
  return cached
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  // تغییر تم سیستم فقط وقتی اثر دارد که کاربر روی `system` باشد؛
  // اگر نبود، snapshot تغییری نمی‌کند و React رندر اضافه نمی‌زند.
  media.addEventListener('change', emit)
  // همگام‌سازی بین تب‌های باز
  window.addEventListener('storage', emit)

  return () => {
    listeners.delete(listener)
    media.removeEventListener('change', emit)
    window.removeEventListener('storage', emit)
  }
}

/**
 * کلاس `dark` را روی `<html>` می‌گذارد.
 *
 * فقط `class` دست می‌زنیم، نه `style`: صفت `style` را سرور نفرستاده و
 * اگر پیش از hydration اضافه شود React mismatch می‌بیند. `color-scheme`
 * هم در CSS (`:root` / `.dark`) تعریف شده، پس نیازی به نوشتن inline
 * نبود.
 */
function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, resolved } = useSyncExternalStore(
    subscribe,
    computeSnapshot,
    () => SERVER_SNAPSHOT
  )

  // همگام‌کردن DOM با state — به‌روزرسانی یک سیستم بیرونی، نه setState
  useEffect(() => {
    applyTheme(resolved)
  }, [resolved])

  const setTheme = useCallback((next: Theme) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // اگر storage در دسترس نبود، تم فقط برای همین سشن اعمال می‌شود
    }
    cached = null
    emit()
  }, [])

  const value = useMemo(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme باید داخل ThemeProvider استفاده شود')
  }
  return context
}
