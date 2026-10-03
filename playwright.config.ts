import { defineConfig, devices } from '@playwright/test'

/**
 * پیکربندی Playwright برای تست‌های E2E واقعی.
 *
 * چرا مرورگر واقعی لازم است:
 *   بخش بزرگی از ریسک این اپ در چیزی است که Vitest روی JSDOM هرگز اجرا نمی‌کند
 *   — Drag & Drop مبتنی بر `@dnd-kit` به Pointer Events و لایه‌بندی واقعی نیاز
 *   دارد، جریان ورود به Supabase به session سمت کلاینت وابسته است، و رفتار
 *   بعد از reload فقط در مرورگر قابل سنجش است. بنابراین تست‌های E2E مرورگری
 *   هستند، نه شبیه‌سازی.
 *
 * چرا `workers: 1` و `fullyParallel: false`:
 *   هر تست با حساب‌های auth واقعی روی یک دیتابیس واقعی کار می‌کند. اجرای موازی
 *   چند کاربر روی صفحه‌ی `/boards` باعث می‌شود «تعداد بوردهای فعال» و لیست‌ها
 *   قابل پیش‌بینی نباشند و تست‌ها به‌صورت flaky دربیایند.
 *
 * نکته: سرور روی پورتی غیر از ۳۰۰۰ بالا می‌آید تا با dev server در حال اجرای
 * خودتان تداخل نکند.
 *
 * نکته‌ی مهم — چرا `localhost` و نه `127.0.0.1`:
 *   نسخه‌ی فعلی Next در حالت dev، درخواست‌های cross-origin برای منابع `/_next/*`
 *   را بلاک می‌کند. اگر baseURL را `127.0.0.1` بگذاریم، این بلاک باعث می‌شود
 *   chunkهای مربوط به hydration بارگذاری نشوند و در نتیجه هیچ event handler
 *   React به فرم‌ها وصل نشود. نشانه‌ی این خرابی ظریف است: فرم به‌جای submit
 *   واقعی، یک GET بومی می‌فرستد و آدرس می‌شود `/login?` (بدون هیچ پارامتری،
 *   چون inputها `name` ندارند) و هیچ درخواستی به Supabase نمی‌رود.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100)
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `${baseURL}/login`,
    reuseExistingServer: true,
    timeout: 240_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})