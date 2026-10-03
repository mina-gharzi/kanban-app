import { expect, type Page } from '@playwright/test'
import type { TestUser } from './users'

/**
 * کمک‌تابع‌های UI.
 *
 * عمداً به‌جای `data-testid` از نام‌های دسترس‌پذیر (label / aria-label / role)
 * استفاده شده است:
 *   ۱) هیچ تغییری در کد اپ لازم نمی‌شود (شرط «تغییر حداقلی»).
 *   ۲) چیزی که تست می‌سنجد همان چیزی است که screen reader می‌خواند؛ اگر
 *      دسترس‌پذیری خراب شود، تست هم می‌افتد.
 * بنابراین اگر یک selector شکست خورد، اول怀疑 کنید که برچسب دسترس‌پذیر عوض
 * شده، نه اینکه بی‌دلیل data-testid اضافه کنیم.
 */

/**
 * انتظار برای hydrate شدن React.
 *
 * این انتظار اختیاری نیست و یک تله‌ی واقعی را می‌بندد:
 *   اگر قبل از hydration چیزی داخل input بنویسیم (مثلاً با `fill`)، هیچ
 *   event handler‌ای وجود ندارد، پس state کامپوننت خالی می‌ماند؛ ولی DOM مقدار
 *   تایپ‌شده را نشان می‌دهد چون React هنوز آن را دوباره overwrite نکرده. بعد
 *   که submit می‌زنیم، فرم با رشته‌های خالی ارسال می‌شود و خطای گمراه‌کننده‌ی
 *   «missing email or phone» از Supabase می‌گیریم. تشخیص این تله از روی ظاهر
 *   تقریباً غیرممکن است، چون همه‌چیز «درست» به نظر می‌رسد.
 *
 *   سیگنال قابل‌اعتماد: React کلید `__reactFiber$…` را روی عناصر میزبان بعد از
 *   hydrate کردن می‌گذارد. تا وقتی این کلید نباشد، تعامل با فرم‌ها معنی ندارد.
 */
export async function waitForHydration(page: Page) {
  await page.waitForFunction(
    () => {
      const all = document.querySelectorAll('*')
      for (const el of all) {
        for (const key of Object.keys(el)) {
          if (key.startsWith('__reactFiber$')) return true
        }
      }
      return false
    },
    undefined,
    { timeout: 45_000 }
  )
}

export async function gotoHydrated(page: Page, path: string) {
  await page.goto(path)
  await waitForHydration(page)
}

export async function login(page: Page, user: TestUser, next?: string) {
  await gotoHydrated(page, next ? `/login?next=${encodeURIComponent(next)}` : '/login')
  await page.getByLabel('ایمیل').fill(user.email)
  await page.getByLabel('رمز عبور').fill(user.password)
  await page.getByRole('button', { name: 'ورود' }).click()
  await expect(page).toHaveURL(/\/boards$/)
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'منوی کاربر' }).click()
  // آیتم‌های Dropdown نقش `menuitem` دارند، نه `button`؛ اگر با `button` صدا
  // بزنیم locator پیدا چیزی نمی‌کند و تست با تایم‌اوت می‌میرد.
  await page.getByRole('menuitem', { name: 'خروج از حساب' }).click()
  await expect(page).toHaveURL(/\/login$/)
}

/** لیست «بوردهای من» روی /boards */
export async function createBoard(page: Page, title: string) {
  await gotoHydrated(page, '/boards')
  await page.getByPlaceholder('مثلاً: برنامه‌ی فصل').fill(title)
  await page.getByRole('button', { name: 'ساخت بورد' }).click()
  // یک بورد هم در کارتِ لیست و هم در نوار کناری لینک دارد؛ با `.first()` و
  // محدود کردن به بخش لیست از «strict mode violation» جلوگیری می‌کنیم.
  const link = page.locator('main a[href^="/board/"], a[href^="/board/"]').filter({ hasText: title }).first()
  await expect(link).toBeVisible()
  return link
}

export async function openBoard(page: Page, title: string) {
  const link = page.locator(`a[href^="/board/"]`, { hasText: title }).first()
  await link.click()
  await expect(page).toHaveURL(/\/board\/[0-9a-f-]{36}$/)
  return page.url()
}

export function column(page: Page, title: string) {
  return page.locator(`[aria-label="ستون ${title}"]`)
}

/**
 * کارت اصلی (نه نسخه‌ی DragOverlay).
 *
 * حین drag، `DragOverlay` یک کپی دیگر از همان کارت را با همان `aria-label`
 * رندر می‌کند. در نتیجه locator بدون `.first()` به دو عنصر می‌خورد و
 * strict-mode خطا می‌دهد — و بدتر، ممکن است روی کپیِ overlay فوکوس شود و
 * keypressها به سنسور نرسند. نسخه‌ی اصلی اولین عنصر در DOM است (overlay
 * انتهای body اضافه می‌شود) و `aria-describedby` مربوط به اعلان‌های dnd-kit
 * را دارد.
 */
export function card(page: Page, title: string) {
  return page.getByRole('button', { name: `کارت ${title}`, exact: true }).first()
}

export async function addColumn(page: Page, title: string) {
  await page.getByRole('button', { name: 'افزودن ستون' }).click()
  await page.getByLabel('نام ستون جدید').fill(title)
  await page.getByLabel('نام ستون جدید').press('Enter')
  await expect(column(page, title)).toBeVisible()
}

export async function addCard(page: Page, columnTitle: string, cardTitle: string) {
  const scope = column(page, columnTitle)
  await scope.getByRole('button', { name: 'افزودن کارت' }).first().click()
  await page.getByLabel('عنوان کارت جدید').fill(cardTitle)
  await page.getByLabel('عنوان کارت جدید').press('Enter')
  await expect(scope.getByRole('button', { name: `کارت ${cardTitle}`, exact: true }).first()).toBeVisible()
}

export async function renameColumn(page: Page, from: string, to: string) {
  const scope = column(page, from)
  await scope.getByRole('button', { name: `کنش‌های ستون ${from}` }).click()
  await page.getByRole('menuitem', { name: 'تغییر نام' }).click()
  const input = page.getByLabel('عنوان ستون')
  await input.fill(to)
  await input.press('Enter')
  await expect(column(page, to)).toBeVisible()
}

/** کارت‌های یک ستون، به ترتیب نمایش */
export async function cardTitlesIn(page: Page, columnTitle: string): Promise<string[]> {
  const cards = column(page, columnTitle).getByRole('button', { name: /^کارت / })
  return (await cards.allInnerTexts()).map((t) => t.trim())
}