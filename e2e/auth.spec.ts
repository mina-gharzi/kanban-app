import { test, expect } from '@playwright/test'
import { createTestUser, deleteAllBoards } from './helpers/users'
import { login, logout, gotoHydrated } from './helpers/app'

/**
 * سناریوهای احراز هویت در مرورگر واقعی.
 *
 * چرا این‌ها مهم‌اند:
 *   تست‌های `tests/security/` سطح HTTP را می‌سنجند (RLS و توکن). اما اینکه
 *   «وارد نشده بودن» واقعاً به صفحه‌ی ورود می‌رسد، و اینکه نشست در کلاینت ساخته
 *   و بعد از خروج واقعاً پاک می‌شود، فقط در مرورگر قابل بررسی است.
 *
 * هر تست کاربر تازه‌ی خودش را می‌سازد، پس تست‌ها به هم وابسته نیستند و نیازی به
 * پاک‌سازی مشترک ندارند.
 */

test.describe('احراز هویت', () => {
  test('کاربر مهمان به /boards می‌رسد و به صفحه‌ی ورود هدایت می‌شود', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/boards')
    await expect(page).toHaveURL(/\/login/)
    expect(page.url()).toContain('next=')
  })

  test('ورود با رمز اشتباه انجام نمی‌شود و خطا نشان داده می‌شود', async ({ page }) => {
    const user = await createTestUser('authbad')
    await page.goto('/login')
    await page.getByLabel('ایمیل').fill(user.email)
    await page.getByLabel('رمز عبور').fill('definitely-wrong-password')
    await page.getByRole('button', { name: 'ورود' }).click()

    await expect(page.getByRole('alert').first()).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('ورود موفق به /boards می‌رساند و ایمیل کاربر در منو دیده می‌شود', async ({ page }) => {
    const user = await createTestUser('authok')
    await login(page, user)
    await page.getByRole('button', { name: 'منوی کاربر' }).click()
    await expect(page.getByText(user.email, { exact: false })).toBeVisible()
  })

  test('بعد از خروج نشست از بین می‌رود و /boards دوباره محافظت می‌شود', async ({ page }) => {
    const user = await createTestUser('authout')
    await login(page, user)
    await logout(page)

    await page.goto('/boards')
    await expect(page).toHaveURL(/\/login/)
  })

  test('پارامتر next به بیرون هدایت نمی‌کند (جلوگیری از open redirect)', async ({ page }) => {
    const user = await createTestUser('authred')
    await gotoHydrated(page, '/login?next=https%3A%2F%2Fevil.example.com')
    await page.getByLabel('ایمیل').fill(user.email)
    await page.getByLabel('رمز عبور').fill(user.password)
    await page.getByRole('button', { name: 'ورود' }).click()

    // باید داخل سایت بماند، نه به دامنه‌ی بیرونی
    await expect(page).toHaveURL(/\/boards$/)
    expect(page.url()).not.toContain('evil.example.com')
  })
})

test.describe('پاک‌سازی', () => {
  test('بوردِ ساخته‌شده از UI با RLS خودِ کاربر قابل حذف است', async ({ page }) => {
    const user = await createTestUser('authclean')
    await login(page, user)

    await page.getByPlaceholder('مثلاً: برنامه‌ی فصل').fill('board-to-clean')
    await page.getByRole('button', { name: 'ساخت بورد' }).click()
    await expect(page.locator('a[href^="/board/"]', { hasText: 'board-to-clean' }).first()).toBeVisible()

    await deleteAllBoards(user)

    await page.reload()
    await expect(page.getByText('هنوز بوردی نساخته‌اید')).toBeVisible()
  })
})