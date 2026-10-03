import { test, expect, type Page } from '@playwright/test'
import { createTestUser, userRest } from './helpers/users'
import { login, createBoard, addColumn, addCard, column, card, gotoHydrated } from './helpers/app'

/**
 * اشتراک‌گذاری از دید UI با نقش‌های واقعی.
 *
 * تفاوت با `tests/security/07`: آن تست مجوزها را در سطح HTTP/RLS می‌سنجد و
 * سریع است. اینجا مسیر کاملِ محصول سنجیده می‌شود: دعوت از UI، پذیرش از UI،
 * و مهم‌تر از همه — اینکه UI برای نقش‌های مختلف واقعاً کنترل‌های متفاوتی
 * نشان می‌دهد. یک policy درست می‌تواند با UI اشتباه پوشیده شود (مثلاً دکمه‌ی
 * حذف به viewer نشان داده شود) و آن باگ در تست HTTP دیده نمی‌شود.
 */

/** انتظار برای دیده شدن یک ستون — نشانه‌ی اینکه بورد با داده رندر شده */
async function waitForColumn(p: Page, title: string) {
  await expect(column(p, title)).toBeVisible({ timeout: 30_000 })
}

test.describe('اشتراک‌گذاری', () => {
  test('viewer بورد را می‌بیند ولی هیچ کنترل ویرایشی ندارد', async ({ page, browser }) => {
    const owner = await createTestUser('shareowner')
    const viewer = await createTestUser('shareviewer')

    await login(page, owner)
    const link = await createBoard(page, 'بورد اشتراکی')
    await link.click()
    await addColumn(page, 'ستون اصلی')
    await waitForColumn(page, 'ستون اصلی')
    await addCard(page, 'ستون اصلی', 'کارت مشترک')
    const boardId = page.url().split('/board/')[1]

    const res = await userRest(owner).rpc('invite_to_board', {
      p_board_id: boardId,
      p_email: viewer.email,
      p_role: 'viewer',
    })
    expect(res.status).toBeLessThan(300)

    const ctx = await browser.newContext()
    const viewerPage = await ctx.newPage()
    await login(viewerPage, viewer)
    const panel = viewerPage.getByRole('region', { name: 'دعوت‌های شما' })
    await expect(panel).toBeVisible({ timeout: 30_000 })
    await panel.getByRole('button', { name: 'پذیرفتن' }).click()

    await expect
      .poll(async () => (await userRest(viewer).get(`board_members?board_id=eq.${boardId}&select=user_id`)).rows?.length ?? 0, { timeout: 20_000 })
      .toBe(1)

    await viewerPage.goto(`/board/${boardId}`)
    await waitForColumn(viewerPage, 'ستون اصلی')

    // داده قابل مشاهده است…
    await expect(card(viewerPage, 'کارت مشترک')).toBeVisible()

    // …ولی هیچ راهی برای تغییر دادن ندارد
    await expect(viewerPage.getByRole('button', { name: 'افزودن ستون' })).toHaveCount(0)
    await expect(viewerPage.getByRole('button', { name: 'افزودن کارت' })).toHaveCount(0)
    await expect(viewerPage.getByRole('button', { name: /جابه‌جایی ستون/ })).toHaveCount(0)
    await expect(viewerPage.getByRole('button', { name: /کنش‌های ستون/ })).toHaveCount(0)

    await ctx.close()
  })

  test('editor می‌تواند کارت بسازد ولی بورد را حذف نمی‌کند', async ({ page, browser }) => {
    const owner = await createTestUser('editowner')
    const editor = await createTestUser('editor1')

    await login(page, owner)
    const link = await createBoard(page, 'بورد ویرایشگر')
    await link.click()
    await addColumn(page, 'کارها')
    await addCard(page, 'کارها', 'کارت موجود')
    const boardId = page.url().split('/board/')[1]

    await userRest(owner).rpc('invite_to_board', {
      p_board_id: boardId,
      p_email: editor.email,
      p_role: 'editor',
    })

    const ctx = await browser.newContext()
    const editorPage = await ctx.newPage()
    await login(editorPage, editor)
    const panel = editorPage.getByRole('region', { name: 'دعوت‌های شما' })
    await expect(panel).toBeVisible({ timeout: 30_000 })
    await panel.getByRole('button', { name: 'پذیرفتن' }).click()
    await expect
      .poll(async () => (await userRest(editor).get(`board_members?board_id=eq.${boardId}&select=user_id`)).rows?.length ?? 0, { timeout: 20_000 })
      .toBe(1)

    await editorPage.goto(`/board/${boardId}`)
    await waitForColumn(editorPage, 'کارها')

    // نوشتن مجاز
    await expect(editorPage.getByRole('button', { name: 'افزودن ستون' })).toBeVisible()
    await addCard(editorPage, 'کارها', 'کارت ساخته‌شده توسط editor')
    await expect(card(editorPage, 'کارت ساخته‌شده توسط editor')).toBeVisible()

    // اما حذف بورد در اختیار editor نیست
    await gotoHydrated(editorPage, '/boards')
    await expect(
      editorPage.getByRole('button', { name: /حذف بورد بورد ویرایشگر/ })
    ).toHaveCount(0)

    await ctx.close()
  })

  test('بورد مشترک در فهرست کاربر دیگر با برچسب نقش دیده می‌شود', async ({ page, browser }) => {
    const owner = await createTestUser('labelowner')
    const viewer = await createTestUser('labelviewer')

    await login(page, owner)
    const link = await createBoard(page, 'بورد برچسب‌دار')
    await link.click()
    await addColumn(page, 'کارها')
    await waitForColumn(page, 'کارها')
    const boardId = page.url().split('/board/')[1]

    await userRest(owner).rpc('invite_to_board', {
      p_board_id: boardId,
      p_email: viewer.email,
      p_role: 'viewer',
    })

    const ctx = await browser.newContext()
    const viewerPage = await ctx.newPage()
    await login(viewerPage, viewer)
    const panel = viewerPage.getByRole('region', { name: 'دعوت‌های شما' })
    await panel.getByRole('button', { name: 'پذیرفتن' }).click()
    await expect
      .poll(async () => (await userRest(viewer).get(`board_members?board_id=eq.${boardId}&select=user_id`)).rows?.length ?? 0, { timeout: 20_000 })
      .toBe(1)

    await gotoHydrated(viewerPage, '/boards')
    // ★ محدود به `main` الزامی است: `BoardSidebar` هم برای هر بورد یک
    // `a[href^="/board/"]` می‌سازد که فقط عنوان دارد و برچسب نقش ندارد.
    // با `.first()` بدون این محدودیت، لینکِ سایدبار انتخاب می‌شد و تست
    // به‌اشتباه نتیجه می‌گرفت که برچسب نقش رندر نشده است.
    const boardLink = viewerPage
      .locator('main a[href^="/board/"]', { hasText: 'بورد برچسب‌دار' })
      .first()
    await expect(boardLink).toBeVisible()
    // نقش نمایش داده می‌شود (viewer → «اشتراکی»). فقط وجود برچسب مهم است،
    // نه متن دقیق یا چیدمانش.
    await expect(boardLink.locator('p', { hasText: 'اشتراکی' })).toBeVisible()

    await ctx.close()
  })
})
