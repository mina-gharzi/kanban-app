'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { permissionsFor, type BoardPermissions } from '@/lib/sharing/roles'

/**
 * مجوزهای کاربر جاری روی بوردِ باز. فقط برای قفل‌کردنِ رابط (دکمه‌ی افزودن،
 * درگ، ویرایش) است؛ تصمیم امنیتی با RLS دیتابیس است و رابط را دور زدن چیزی
 * را باز نمی‌کند. پیش‌فرض «مالک» است تا کامپوننتی که بیرون از provider رندر
 * می‌شود رفتار قبلی را داشته باشد.
 */
const Context = createContext<BoardPermissions>(permissionsFor('owner'))

export function BoardPermissionsProvider({
  permissions,
  children,
}: {
  permissions: BoardPermissions
  children: ReactNode
}) {
  return <Context.Provider value={permissions}>{children}</Context.Provider>
}

export function useBoardPermissions(): BoardPermissions {
  return useContext(Context)
}
