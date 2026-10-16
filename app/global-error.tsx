'use client'

import { useEffect } from 'react'
import { logError } from '@/lib/errors/logError'
import { normalizeError } from '@/lib/errors/normalizeError'
import { AlertTriangleIcon } from '@/components/ui/icons'

/**
 * مرز خطای ریشه. این کامپوننت به‌جای layout ریشه رندر می‌شود و باید خودش
 * تأمین‌کننده‌ی `<html>`/`<body>` باشد. چون layout (و در نتیجه import آن از
 * `globals.css`) کنار گذاشته می‌شود، استایل‌های طراحی به‌طور قطعی در دسترس
 * نیستند؛ به همین دلیل یک نسخه‌ی کوچک و خودبسنده از توکن‌های رنگ اینجا
 * inline شده — همان روشی که global-error داخلی خود Next هم به کار می‌برد.
 */
const globalErrorCss = `
:root {
  color-scheme: light;
  --ge-bg: #ebeff5;
  --ge-surface: #fcffff;
  --ge-border: #bec9d8;
  --ge-text: #0f141c;
  --ge-text-2: #333c4b;
  --ge-text-muted: #505966;
  --ge-danger: #b3263a;
  --ge-danger-soft: #fbe7ea;
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --ge-bg: #0e0f12;
    --ge-surface: #2c2f36;
    --ge-border: #3d4c60;
    --ge-text: #e9eef6;
    --ge-text-2: #b3bece;
    --ge-text-muted: #9ca6b6;
    --ge-danger: #f26d7e;
    --ge-danger-soft: #3a1a21;
  }
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  min-height: 100dvh;
  background: var(--ge-bg);
  color: var(--ge-text);
  font-family: "Pinar", ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.ge-wrap {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1.5rem;
  text-align: center;
}
.ge-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 9999px;
  background: var(--ge-danger-soft);
  color: var(--ge-danger);
}
.ge-title { margin: 0; font-size: 1rem; font-weight: 500; line-height: 1.6; }
.ge-text {
  margin: 0;
  max-width: 24rem;
  font-size: 0.8125rem;
  line-height: 1.9;
  color: var(--ge-text-2);
}
.ge-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
.ge-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.5rem;
  padding: 0 1rem;
  border: 1px solid var(--ge-border);
  border-radius: 0.5rem;
  background: var(--ge-surface);
  color: var(--ge-text);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}
.ge-btn:hover { border-color: var(--ge-text-muted); }
.ge-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.5rem;
  padding: 0 1rem;
  border-radius: 0.5rem;
  color: var(--ge-text-2);
  font-weight: 500;
  text-decoration: none;
}
.ge-link:hover { color: var(--ge-text); }
:focus-visible { outline: 2px solid var(--ge-danger); outline-offset: 2px; }
`

/**
 * خطای سراسری UI که مرزهای داخلی نگرفته‌اند. عمداً هیچ متن/جزئیات خام خطا
 * نمایش داده نمی‌شود؛ فقط پیام امن فارسی و دو راه خروج: `retry` (به‌روزرسانی
 * route و بازنشانی مرز) و بازگشت به صفحه‌ی اصلی.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  useEffect(() => {
    logError(normalizeError(error), 'app.global-render')
  }, [error])

  return (
    <html lang="fa" dir="rtl">
      <head>
        <style>{globalErrorCss}</style>
      </head>
      <body>
        <div className="ge-wrap">
          <span className="ge-badge">
            <AlertTriangleIcon size={22} />
          </span>
          <h1 className="ge-title">مشکلی پیش آمده است</h1>
          <p className="ge-text">
            خطایی در بارگذاری برنامه رخ داد. می‌توانید دوباره تلاش کنید؛ اگر
            مشکل ادامه داشت، صفحه را تازه‌سازی کنید.
          </p>
          <div className="ge-actions">
            <button type="button" className="ge-btn" onClick={() => retry()}>
              تلاش دوباره
            </button>
            {/* ریشه خراب است؛ بارگذاری کامل صفحه امن‌تر از ناوبری سمت کلاینت (next/link) است. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="ge-link" href="/">
              بازگشت به صفحه‌ی اصلی
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
