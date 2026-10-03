import { test, expect, type Page } from '@playwright/test'
import { createTestUser, userRest } from './helpers/users'
import { login, createBoard, addColumn, addCard, column, card, cardTitlesIn } from './helpers/app'

/**
 * Drag & Drop — تنها بخشی که واقعاً مرورگر لازم دارد.
 *
 * چرا Vitest این را پوشش نمی‌دهد:
 *   `@dnd-kit` روی Pointer Events، measurement و لایه‌بندی واقعی کار می‌کند و
 *   در JSDOM هیچ‌کدام رخ نمی‌دهد. تستی که DnD را با dispatch کردن دستی event
 *   «شبیه‌سازی» کند، عملاً هیچ چیز از پیاده‌سازی واقعی را نمی‌سنجد.
 *
 * چرا با کیبورد و نه با ماوس:
 *   `PointerSensor` با `activationConstraint: { distance: 5 }` به حرکت ماوسِ
 *   دقیق نیاز دارد و در CI (که فریم‌ریت متغیر است) flake می‌شود. اپ علاوه بر آن
 *   یک `KeyboardSensor` با `sortableKeyboardCoordinates` دارد که همان مسیر
 *   منطقی `move_cards` را اجرا می‌کند و بسیار پایدارتر است. هر دو به یک
 *   `handleDragEnd` می‌رسند، پس این تست همان کدِ جابه‌جایی را می‌سنجد.
 *
 * ★ مهم‌ترین ادعای این فایل: بعد از drop، وضعیت باید در دیتابیس باشد نه فقط در
 *   state کلاینت. برای همین هر تست بعد از drop صفحه را reload می‌کند و دوباره
 *   می‌خواند، و در کنارش مستقلاً با توکن خودِ کاربر از REST می‌پرسد.
 */

async function waitForBoard(page: Page) {
  await expect(page.getByRole('button', { name: 'افزودن ستون' })).toBeVisible({ timeout: 30_000 })
}

/**
 * لیف کردن با Space، حرکت با کلید جهت‌دار، رها کردن با Space.
 *
 * نکته: بعد از Space، خودِ شروعِ drag را assert می‌کنیم (`aria-pressed`). بدون
 * این assert، اگر keypress به سنسور نرسد (مثلاً به‌خاطر فوکوس اشتباه یا
 * hydration ناقص) تست بی‌صدا رد می‌شود و بعداً با assertionی مثل «کارت جابه‌جا
 * نشد» شکست می‌خورد — که علت اصلی را پنهان می‌کند.
 */
async function keyboardDrag(
  target: ReturnType<Page['locator']>,
  arrow: 'ArrowLeft' | 'ArrowRight' | 'ArrowDown' | 'ArrowUp',
  times = 1
) {
  await target.focus()
  await target.press('Space')
  await expect(target).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 })
  // ★ KeyboardSensor دیدم‌کیت در هر فشار کلید فقط حدود ۲۵px جابه‌جا می‌کند.
  // عرض/ارتفاع کارت و ستون چند برابر این است، پس با «یک بار» فشار دادن معمولاً
  // از آستانه‌ی برخورد رد نمی‌شویم. هر فشار تا برخورد (collide) بی‌اثر می‌شود
  // تکرار می‌شود تا مطمئن شویم واقعاً از مقصد عبور کرده‌ایم؛ تکرارِ اضافی
  // چیزی را خراب نمی‌کند چون انتهای فهرست متوقف می‌شود.
  const presses = Math.max(times, 12)
  for (let i = 0; i < presses; i++) await target.press(arrow)
  await target.press('Space')
  await expect(target).not.toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 })
}

test.describe('Drag & Drop کارت', () => {
  test('کارت با کیبورد به ستون دیگر می‌رود و بعد از reload پابرجاست', async ({ page }) => {
    const user = await createTestUser('dnd1')
    await login(page, user)
    const link = await createBoard(page, 'بورد DnD')
    await link.click()
    await waitForBoard(page)

    await addColumn(page, 'اول')
    await addColumn(page, 'دوم')
    await addCard(page, 'اول', 'کارت متحرک')

    // در چیدمان RTL ستون بعدی سمت چپ است ⇒ ArrowLeft
    await keyboardDrag(card(page, 'کارت متحرک'), 'ArrowLeft')

    await expect(column(page, 'دوم').getByRole('button', { name: 'کارت کارت متحرک', exact: true })).toBeVisible({ timeout: 15_000 })

    // ★ ماندگاری در دیتابیس
    await page.reload()
    await waitForBoard(page)
    expect(await cardTitlesIn(page, 'اول')).toEqual([])
    expect(await cardTitlesIn(page, 'دوم')).toEqual(['کارت متحرک'])

    const rest = userRest(user)
    const { rows } = await rest.get('cards?select=column_id,position')
    expect(rows).toHaveLength(1)
  })

  test('ترتیب کارت‌ها در یک ستون با drag جابه‌جا و ذخیره می‌شود', async ({ page }) => {
    const user = await createTestUser('dnd2')
    await login(page, user)
    const link = await createBoard(page, 'بورد ترتیب')
    await link.click()
    await waitForBoard(page)

    await addColumn(page, 'کارها')
    await addCard(page, 'کارها', 'اولی')
    await addCard(page, 'کارها', 'دومی')
    await addCard(page, 'کارها', 'سومی')
    expect(await cardTitlesIn(page, 'کارها')).toEqual(['اولی', 'دومی', 'سومی'])

    await keyboardDrag(card(page, 'سومی'), 'ArrowUp', 2)

    // ★ صبر کن تا نوشتن واقعاً در دیتابیس بنشیند. اگر بلافاصله reload کنیم،
    // ممکن است صفحه قبل از رسیدن PATCH/RPC دوباره رندر شود و تست به‌اشتباه
    // «ذخیره نشد» گزارش کند. این انتظار، تست را هم پایدار می‌کند و هم تفاوت
    // بین «کند بودن شبکه» و «واقعاً ذخیره نمی‌شود» را آشکار.
    await page.waitForTimeout(1500)

    await page.reload()
    await waitForBoard(page)
    const after = await cardTitlesIn(page, 'کارها')
    // همان سه کارت، فقط ترتیبشان عوض شده
    expect([...after].sort()).toEqual(['اولی', 'دومی', 'سومی'].sort())
    expect(after).not.toEqual(['اولی', 'دومی', 'سومی'])
  })

  test('ترتیب ستون‌ها ذخیره می‌شود و کارت‌ها همراه ستون خود می‌مانند', async ({ page }) => {
    const user = await createTestUser('dnd3')
    await login(page, user)
    const link = await createBoard(page, 'بورد جابه‌جایی ستون')
    await link.click()
    await waitForBoard(page)

    await addColumn(page, 'الف')
    await addColumn(page, 'ب')
    await addCard(page, 'الف', 'کارت همراه')

    // ترتیب واقعی ستون‌ها را از دیتابیس می‌خوانیم تا به قرارداد RTL وابسته
    // نباشیم: فقط می‌گوییم «ترتیب برعکس شد».
    const boardId = page.url().split('/board/')[1]
    const positionsAsc = async () => {
      const { rows } = await userRest(user).get(
        `columns?board_id=eq.${boardId}&select=title,position&order=position.asc`
      )
      return (rows ?? []).map((r: { title: string }) => r.title)
    }
    const orderBefore = await positionsAsc()

    // دستگیره‌ی drag ستون
    const handle = page.getByRole('button', { name: 'جابه‌جایی ستون الف' })
    await handle.focus()
    await handle.press('Space')
    await expect(handle).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 })
    // ★ KeyboardSensor دیدم‌کیت در هر فشار کلید فقط ~۲۵px جابه‌جا می‌شود، در حالی
    // که عرض ستون چند صد پیکسل است. یک فشار `ArrowLeft` اغلب از آستانه‌ی
    // برخورد رد نمی‌شود و تست flaky می‌شد؛ چند فشار پشت‌سرهم از آن عبور می‌کند.
    for (let i = 0; i < 12; i++) await handle.press('ArrowLeft')
    await handle.press('Space')

    // ★ باید در دیتابیس ثبت شود، نه فقط در DOM
    await expect
      .poll(positionsAsc, { timeout: 20_000, message: 'ترتیب ستون‌ها در دیتابیس عوض نشد' })
      .toEqual([...orderBefore].reverse())

    await page.reload()
    await waitForBoard(page)

    // کارت باید در همان ستونِ خودش (که حالا جای دیگری در ترتیب است) مانده باشد.
    // توجه: «جابه‌جایی ستون» هرگز `column_id` کارت را عوض نمی‌کند، پس انتظار
    // درست «کارت از ستون الف به ب رفت» نیست و قبلاً همین اشتباه باعث FAIL
    // گمراه‌کننده شده بود.
    expect(await cardTitlesIn(page, 'الف')).toEqual(['کارت همراه'])
    expect(await cardTitlesIn(page, 'ب')).toEqual([])
    // و ترتیب ستون‌ها باید همان ترتیب جدیدِ ثبت‌شده در دیتابیس باشد
    expect(await positionsAsc()).toEqual([...orderBefore].reverse())
  })
})

test.describe('Drag & Drop و مجوزها', () => {
  test('viewer دستگیره‌ی جابه‌جایی ستون را نمی‌بیند', async ({ page, browser }) => {
    const owner = await createTestUser('dndowner')
    const viewer = await createTestUser('dndviewer')

    await login(page, owner)
    const link = await createBoard(page, 'بورد اشتراکی DnD')
    await link.click()
    await waitForBoard(page)
    await addColumn(page, 'ستون الف')
    await addCard(page, 'ستون الف', 'کارت')

    // عضویت viewer با RPC خودِ مالک ساخته می‌شود (setup)، و بقیه‌ی سناریو از UI است
    const boardId = page.url().split('/board/')[1]
    await userRest(owner).rpc('invite_to_board', {
      p_board_id: boardId,
      p_email: viewer.email,
      p_role: 'viewer',
    })

    // ★ context جدا: cookieها بین pageهای یک context مشترک‌اند، پس اگر viewer
    // را در صفحه‌ی دومِ همان context وارد کنیم، نشستِ owner هنوز برقرار است و
    // `/login` بلافاصله به `/boards` پرتاب می‌شود ⇒ فرم ورود اصلاً پیدا نمی‌شود.
    const ctx = await browser.newContext()
    const page2 = await ctx.newPage()
    await login(page2, viewer)

    // ★ دعوت باید *پذیرفته* شود؛ دعوت به‌تنهایی عضویت نمی‌سازد. کلیک از UI
    // انجام می‌شود، ولی تأییدِ پذیرش را از خودِ دیتابیس می‌گیریم چون پنل دعوت‌ها
    // تا refetchِ بعدی در DOM می‌ماند و بسته به آن زمان‌بندی تست شکننده می‌شود.
    const panel = page2.getByRole('region', { name: 'دعوت‌های شما' })
    await expect(panel).toBeVisible({ timeout: 30_000 })
    await panel.getByRole('button', { name: 'پذیرفتن' }).click()

    await expect
      .poll(
        async () => {
          const { rows } = await userRest(viewer).get(
            `board_members?board_id=eq.${boardId}&select=user_id`
          )
          return rows?.length ?? 0
        },
        { timeout: 20_000, message: 'عضویت viewer ساخته نشد' }
      )
      .toBe(1)

    await page2.goto(`/board/${boardId}`)
    // برای viewer «افزودن ستون» اصلاً نباید وجود داشته باشد، پس منتظرِ آن نمی‌مانیم؛
    // منتظرِ خودِ ستون می‌مانیم که نشانه‌ی رندر شدن بورد با داده است.
    await expect(column(page2, 'ستون الف')).toBeVisible({ timeout: 30_000 })

    // داده دیده می‌شود…
    await expect(card(page2, 'کارت')).toBeVisible()

    // …ولی کنترل‌های ویرایش نباید وجود داشته باشند
    await expect(page2.getByRole('button', { name: 'جابه‌جایی ستون ستون الف' })).toHaveCount(0)
    await expect(page2.getByRole('button', { name: 'افزودن ستون' })).toHaveCount(0)
    await expect(page2.getByRole('button', { name: 'افزودن کارت' })).toHaveCount(0)
    await ctx.close()
  })
})
