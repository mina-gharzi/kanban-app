/**
 * سناریوی استاندارد: دو کاربر واقعی + fixture یکی برای A.
 *
 * تضمین‌ها:
 *  - در هر شرایطی (حتی خطا) داده‌ی تست پاک می‌شود (finally)
 *  - همیشه یک «کنترل مثبت» اجرا می‌شود: اگر A نتواند داده‌ی خودش را ببیند،
 *    بقیه‌ی تست‌ها بی‌معنا می‌شوند و باید UNVERIFIED اعلام شوند، نه PASS.
 */

import { config, Rest, createUser, createFixture, dropFixture, STATUS } from './harness.mjs'

/**
 * @param {(ctx) => Promise<void>} body
 */
export async function withScenario(body) {
  const { url, anonKey } = config()
  const anon = new Rest(url, anonKey)

  const createdUsers = []
  let restA = null
  let restB = null
  let fixtures = null
  let positiveControlOk = false

  try {
    const a = await createUser(url, anonKey, 'A')
    createdUsers.push(a)
    restA = anon.asUser(a.accessToken)

    const b = await createUser(url, anonKey, 'B')
    createdUsers.push(b)
    restB = anon.asUser(b.accessToken)

    fixtures = await createFixture(restA, a.id, {
      boards: 1,
      columnsPerBoard: 2,
      cardsPerColumn: 2,
    })

    // کنترل مثبت: A باید بتواند داده‌ی خودش را ببیند و تغییر دهد.
    const visible = await restA.get('/rest/v1/boards?select=id&limit=10')
    positiveControlOk = visible.status === 200 && visible.rows === 1
    if (!positiveControlOk) {
      console.warn(
        '  ⚠ هشدار: کنترل مثبت شکست خورد — A داده‌ی خودش را نمی‌بیند. ' +
          'نتایج این فایل قابل اعتماد نیستند.'
      )
    }

    const ctx = {
      url,
      anonKey,
      anon,
      a,
      b,
      restA,
      restB,
      fixture: fixtures[0],
      fixtures,
      /** اگر کنترل مثبت شکست خورده باشد، PASS دادن گمراه‌کننده است. */
      gate() {
        return positiveControlOk
      },
    }

    await body(ctx)
  } finally {
    if (restA && fixtures) {
      const stats = await dropFixture(restA, fixtures)
      console.log(
        `\n  پاک‌سازی: ${stats.boards} board / ${stats.columns} column / ${stats.cards} card حذف شد`
      )
    }
    if (createdUsers.length) {
      console.log('\n  حساب‌های auth ساخته‌شده (بدون service_role قابل حذف نیستند):')
      for (const u of createdUsers) console.log(`    ${u.label}: ${u.email}`)
      console.log('  ایمیل‌ها example.test هستند تا به هیچ inbox واقعی نرسند.')
    }
  }
}

/**
 * ثبت نتیجه با در نظر گرفتن کنترل مثبت.
 *
 * اگر کنترل مثبت شکست خورده باشد، «A نتوانست داده‌ی خودش را ببیند» باعث
 * می‌شود تست‌های بعدی به‌اشتباه PASS شوند (چون همه‌چیز ۰ سطر برمی‌گردد).
 * پس در آن حالت UNVERIFIED ثبت می‌کنیم، نه PASS.
 *
 * @param {import('./harness.mjs').Report} report
 */
export function gated(report, ctx, passed, name, expected, actual, note) {
  if (passed && !ctx.gate()) {
    return report.record(
      STATUS.UNVERIFIED,
      name,
      expected,
      actual,
      'کنترل مثبت شکست خورد ⇒ نتیجه قابل استناد نیست'
    )
  }
  return report.record(passed ? STATUS.PASS : STATUS.FAIL, name, expected, actual, note)
}
