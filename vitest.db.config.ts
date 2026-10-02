import { defineConfig } from 'vitest/config'

// تست‌های دیتابیس: Postgres واقعی (PGlite/WASM) + migrationهای پروژه؛ هیچ اتصالی به Supabase ندارند.
//   npm i -D @electric-sql/pglite   و   npm run test:db
export default defineConfig({
  test: {
    include: ['tests/db/**/*.test.mjs'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
})
