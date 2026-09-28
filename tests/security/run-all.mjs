/**
 * اجرای همه‌ی تست‌های امنیتی و جمع‌کردن نتیجه.
 *
 * هر فایل در یک process جدا اجرا می‌شود تا خطای یکی بقیه را متوقف نکند و
 * کاربر ساخته‌شده‌ی همان تست هم بی‌نشانی رها نشود (هر فایل try/finally خودش
 * را دارد). در پایان یک جمع‌بندی کلی چاپ می‌شود و اگر جایی FAIL باشد
 * exit code برابر ۱ می‌شود تا در CI واقعاً شکست دیده شود.
 *
 * هشدار: این تست‌ها روی دیتابیس واقعیِ متصل به .env.local اجرا می‌شوند و
 * حساب آزمایشی می‌سازند. آن‌ها را روی دیتابیس عملیاتی اجرا نکنید.
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

const SUITES = [
  '01-ownership-isolation.test.mjs',
  '02-insert-with-check.test.mjs',
  '03-fk-cascade.test.mjs',
  '04-move-rpc.test.mjs',
  '05-card-constraints.test.mjs',
  '06-realtime.test.mjs',
]

/** یک suite را اجرا می‌کند و {name, passed, failed, unverified} برمی‌گرداند. */
function runSuite(name) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(here, name)], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { out += d })

    child.on('close', (code) => {
      process.stdout.write(out)

      // شمارش از خط «خلاصه:» که Report چاپ می‌کند
      const m = out.match(/خلاصه:\s*(\d+)\s*PASS\s*\/\s*(\d+)\s*FAIL\s*\/\s*(\d+)\s*UNVERIFIED/)
      resolve({
        name,
        code,
        passed: m ? Number(m[1]) : null,
        failed: m ? Number(m[2]) : null,
        unverified: m ? Number(m[3]) : null,
      })
    })
  })
}

const results = []
for (const suite of SUITES) {
  console.log(`\n${'█'.repeat(70)}\n█ ${suite}\n${'█'.repeat(70)}`)
  results.push(await runSuite(suite))
}

console.log(`\n${'═'.repeat(70)}`)
console.log('جمع‌بندی کل تست‌های امنیتی')
console.log('═'.repeat(70))
let tp = 0
let tf = 0
let tu = 0
for (const r of results) {
  const mark = r.failed > 0 ? '✘' : '✔'
  console.log(
    `  ${mark} ${r.name.padEnd(34)} ` +
      `${r.passed ?? '?'} PASS / ${r.failed ?? '?'} FAIL / ${r.unverified ?? '?'} UNVERIFIED`
  )
  if (r.passed === null) {
    console.log(`      ⚠ خروجی قابل تجزیه نبود (exit=${r.code})`)
  }
  tp += r.passed ?? 0
  tf += r.failed ?? 0
  tu += r.unverified ?? 0
}
console.log('─'.repeat(70))
console.log(`  مجموع: ${tp} PASS / ${tf} FAIL / ${tu} UNVERIFIED`)
console.log('═'.repeat(70))

process.exitCode = tf > 0 || results.some((r) => r.code !== 0 && r.failed === 0) ? 1 : 0
