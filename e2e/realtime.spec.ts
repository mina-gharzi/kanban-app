import { test, expect, type Page } from '@playwright/test'
import { createTestUser, userRest } from './helpers/users'
import { login, createBoard, addColumn, addCard, column, card, waitForHydration } from './helpers/app'

/**
 * Realtime — دو کاربر، دو مرورگر، یک بورد.
 *
 * وضعیت واقعی این محیط:
 *   جدول‌های `boards`/`columns`/`cards` روی دیتابیس متصل به `.env.local` عضو
 *   publication به نام `supabase_realtime` **نیستند**، بنابراین subscribe شکست
 *   می‌خورد و هیچ رویدادی به کلاینت نمی‌رسد. تست زیر عمداً این را می‌سنجد و
 *   FAIL می‌شود — این «مخفی کردن» خرابی نیست، بلکه گزارش صادقانه است.
 *
 *   ریشه‌ی فنی: migration
 *   `supabase/migrations/20260101000001_enable_realtime_publication.sql`
 *   باید این سه جدول را به publication اضافه کند. اجرای migration روی این
 *   پروژه‌ی محلی در دسترس نیست (به `service_role` یا دسترسی SQL نیاز دارد و
 *   هیچ‌کدام در این محیط موجود نیست).
 *
 *   تا وقتی این وضعیت برطرف نشود، «زنده بودن UI» قابل اثبات نیست؛ ولی رفتار
 *   fallback اپ (بازخوانی دستی) هنوز سنجیده می‌شود تا بدانیم اپ در نبود
 *   realtime هم درست کار می‌کند یا کاربر را با داده‌ی کهنه رها می‌کند.
 */

async function waitForColumn(p: Page, title: string) {
  await expect(column(p, title)).toBeVisible({ timeout: 30_000 })
}

test.describe('Realtime', () => {
  test('کارت ساخته‌شده توسط کاربر دوم بدون reload در صفحه‌ی اول ظاهر می‌شود', async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000)
    test.fail(
      true,
      'انتظار می‌رود تا وقتی boards/columns/cards به publication برسدند، شکست بخورد'
    )

    const a = await createTestUser('rtA')
    const b = await createTestUser('rtB')

    await login(page, a)
    const link = await createBoard(page, 'بورد realtime')
    await link.click()
    await addColumn(page, 'کارها')
    const boardId = page.url().split('/board/')[1]

    // B عضو editor می‌شود تا بتواند کارت بسازد
    await userRest(a).rpc('invite_to_board', {
      p_board_id: boardId,
      p_email: b.email,
      p_role: 'editor',
    })

    const ctx = await browser.newContext()
    const pageB = await ctx.newPage()
    await login(pageB, b)
    const panel = pageB.getByRole('region', { name: 'دعوت‌های شما' })
    await expect(panel).toBeVisible({ timeout: 30_000 })
    await panel.getByRole('button', { name: 'پذیرفتن' }).click()
    await expect
      .poll(
        async () =>
          (await userRest(b).get(`board_members?board_id=eq.${boardId}&select=user_id`)).rows?.length ?? 0,
        { timeout: 20_000 }
      )
      .toBe(1)

    // هر دو روی یک بورد، دو نشست مستقل
    await pageB.goto(`/board/${boardId}`)
    await waitForColumn(pageB, 'کارها')
    await page.reload()
    await waitForHydration(page)
    await waitForColumn(page, 'کارها')

    // A بورد را در حالت «تماشا» نگه می‌دارد و B کارت می‌سازد
    await addCard(pageB, 'کارها', 'کارت زنده')

    // بدون reload باید دیده شود. اگر realtime کار می‌کرد، این انتظار پاس می‌شد.
    //
    // `test.fail()` یعنی «این تست *باید* شکست بخورد تا وقتی publication درست
    // شد، شکستِ ناگهانی و معنادار بدهد». اگر بعد از رفع مشکل پاس شود،
    // Playwright خودش خطا می‌دهد تا این علامت را برداریم — یعنی هیچ‌وقت
    // یک خرابی واقعی پنهان نمی‌شود.
    await expect(
      card(page, 'کارت زنده'),
      'کارت ساخته‌شده در مرورگر دوم باید بدون reload در مرورگر اول ظاهر شود'
    ).toBeVisible({ timeout: 20_000 })

    await ctx.close()
  })

  test('کاربر با reload دستی همیشه داده‌ی درست را می‌بیند (fallback)', async ({ page }) => {
    const user = await createTestUser('rtfallback')
    await login(page, user)
    const link = await createBoard(page, 'بورد fallback')
    await link.click()
    await addColumn(page, 'کارها')
    const boardId = page.url().split('/board/')[1]

    // از بیرون از UI یک کارت می‌سازیم تا ثابت کنیم داده‌ی تازه پس از بارگذاری
    // دوباره درست خوانده می‌شود (یعنی مشکل فقط نبودِ push است، نه خواندن).
    const rest = userRest(user)
    const { rows } = await rest.get(`columns?board_id=eq.${boardId}&select=id`)
    const created = await rest.post('cards', {
      column_id: rows?.[0]?.id,
      title: 'کارت بیرونی',
      position: 0,
    })
    expect(created.status).toBeLessThan(300)

    await page.reload()
    await waitForHydration(page)
    await waitForColumn(page, 'کارها')
    await expect(card(page, 'کارت بیرونی')).toBeVisible()
  })
})
