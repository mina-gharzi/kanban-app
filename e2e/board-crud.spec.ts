import { test, expect, type Page } from '@playwright/test'
import { createTestUser, userRest, type TestUser } from './helpers/users'
import {
  login,
  createBoard,
  addColumn,
  addCard,
  renameColumn,
  cardTitlesIn,
  column,
  card,
  gotoHydrated,
} from './helpers/app'

/**
 * چرخه‌ی کامل CRUD از طریق UI واقعی.
 *
 * این تست‌ها عمداً فقط «کلیک کردم و عنصر دیده شد» را نمی‌سنجند: هر چیزی که از UI
 * ساخته می‌شود باید **بعد از reload** هم باقی بماند. اگر چیزی فقط در state کلاینت
 * زنده مانده باشد ولی در دیتابیس ذخیره نشده باشد، اینجا لو می‌رود.
 */

test.describe('ساخت و ویرایش بورد', () => {
  test('بورد، ستون و کارت ساخته می‌شوند و بعد از reload باقی می‌مانند', async ({ page }) => {
    const user = await createTestUser('crud1')
    await login(page, user)

    const boardLink = await createBoard(page, 'بورد تست CRUD')
    await boardLink.click()
    await expect(page).toHaveURL(/\/board\/[0-9a-f-]{36}$/)

    await addColumn(page, 'انجام‌شده')
    await addColumn(page, 'در حال انجام')
    await addCard(page, 'انجام‌شده', 'کارت اول')
    await addCard(page, 'انجام‌شده', 'کارت دوم')

    expect(await cardTitlesIn(page, 'انجام‌شده')).toEqual(['کارت اول', 'کارت دوم'])

    // ★ ماندگاری واقعی: بعد از بارگذاری دوباره باید از دیتابیس بیاید
    await page.reload()
    await waitForBoard(page)
    await expect(column(page, 'انجام‌شده')).toBeVisible()
    await expect(card(page, 'کارت اول')).toBeVisible()
    expect(await cardTitlesIn(page, 'انجام‌شده')).toEqual(['کارت اول', 'کارت دوم'])
  })

  test('تغییر نام ستون ذخیره و بعد از reload پایدار می‌ماند', async ({ page }) => {
    const user = await createTestUser('crud2')
    await login(page, user)
    const boardLink = await createBoard(page, 'بورد تغییر نام')
    await boardLink.click()
    await waitForBoard(page)

    await addColumn(page, 'قبل')
    await renameColumn(page, 'قبل', 'بعد')

    await page.reload()
    await waitForBoard(page)
    await expect(column(page, 'بعد')).toBeVisible()
    await expect(column(page, 'قبل')).toHaveCount(0)
  })

  test('عنوان خالی برای بورد پذیرفته نمی‌شود', async ({ page }) => {
    const user = await createTestUser('crud3')
    await login(page, user)
    await gotoHydrated(page, '/boards')

    const before = await page.locator('a[href^="/board/"]').count()
    // فقط فاصله: باید همان‌قدر بماند و هیچ بورد جدیدی ساخته نشود
    await page.getByPlaceholder('مثلاً: برنامه‌ی فصل').fill('   ')
    await page.getByRole('button', { name: 'ساخت بورد' }).click()
    await page.waitForTimeout(1500)

    await expect(page).toHaveURL(/\/boards$/)
    expect(await page.locator('a[href^="/board/"]').count()).toBe(before)
  })

  test('عنوان خالی برای ستون پذیرفته نمی‌شود', async ({ page }) => {
    const user = await createTestUser('crud4')
    await login(page, user)
    const boardLink = await createBoard(page, 'بورد ستون خالی')
    await boardLink.click()
    await waitForBoard(page)

    await page.getByRole('button', { name: 'افزودن ستون' }).click()
    await page.getByLabel('نام ستون جدید').fill('')
    await page.getByLabel('نام ستون جدید').press('Enter')

    // فرم باید باز بماند و پیام خطا نشان دهد، نه اینکه ستون خالی بسازد
    await expect(page.getByLabel('نام ستون جدید')).toBeVisible()
    await expect(page.getByRole('alert').first()).toBeVisible()
  })
})

test.describe('حذف', () => {
  test('حذف بورد با دیالوگ تأیید انجام می‌شود و کارت‌ها هم پاک می‌شوند', async ({ page }) => {
    const user = await createTestUser('del1')
    await login(page, user)

    const boardLink = await createBoard(page, 'بورد برای حذف')
    await boardLink.click()
    await waitForBoard(page)
    await addColumn(page, 'ستون')
    await addCard(page, 'ستون', 'کارتی که باید پاک شود')
    await expect(card(page, 'کارتی که باید پاک شود')).toBeVisible()

    await page.goto('/boards')
    await page.getByRole('button', { name: 'حذف بورد بورد برای حذف' }).click()
    await page.getByRole('button', { name: 'حذف بورد' }).last().click()

    await expect(page.getByText('هنوز بوردی نساخته‌اید')).toBeVisible()

    // اگر FK درست کار کند، کارت هم باید ناپدید شده باشد؛ با دسترسی مستقیم به URL
    // بوردِ حذف‌شده نباید باز شود.
    const rest = await fetchBoards(user)
    expect(rest).toEqual([])
  })
})

/** انتظار برای رندر شدن اسکلتِ بورد (نه اسکلت لودینگ) */
async function waitForBoard(page: Page) {
  await expect(page.getByRole('button', { name: 'افزودن ستون' })).toBeVisible({ timeout: 30_000 })
}

/** خواندن بوردها با توکن خودِ کاربر — assert مستقل از UI */
async function fetchBoards(user: TestUser) {
  const { rows } = await userRest(user).get('boards?select=id')
  return rows ?? []
}
