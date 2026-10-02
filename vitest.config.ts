import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // تست‌های کامپوننت (jsdom) JSX را بدون import دستی React می‌خواهند
  // (Vite 8: transformer اکسیدیشن `oxc` است؛ tsconfig پروژه jsx را `preserve` می‌گذارد و برای تست باید automatic شود)
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    // نگاشت `@/…` مثل tsconfig، تا تست‌ها بتوانند ماژول‌هایی را که با alias import می‌کنند بارگذاری کنند
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    // `.tsx` = تست کامپوننت؛ هر فایل با `// @vitest-environment jsdom` محیط DOM می‌گیرد
    include: ['lib/**/*.test.ts', 'components/**/*.test.tsx', 'hooks/**/*.test.tsx'],
    // اسکریپت‌های امنیتی دستی‌اند و به دیتابیس واقعی وصل می‌شوند؛ نباید با `npm test` اجرا شوند
    exclude: ['tests/security/**', 'node_modules/**'],
  },
})
