/**
 * دود — قبل از نوشتن ماتریس کامل، خودِ هارنس را راستی‌آزمایی می‌کند:
 * آیا می‌توانیم کاربر واقعی بسازیم، session بگیریم، fixture بنویسیم و
 * همان چیزی را که نوشتیم بخوانیم؟ اگر این شکست بخورد، بقیه‌ی تست‌ها
 * بی‌معنا می‌شوند.
 */
import { config, Rest, createUser, createFixture, dropFixture } from './helpers/harness.mjs'

const { url, anonKey } = config()
console.log('پیکربندی:', url)

const anon = new Rest(url, anonKey)

console.log('\n۱) ساخت User A')
const a = await createUser(url, anonKey, 'A')
console.log('   id  :', a.id)
console.log('   mail:', a.email)

const restA = anon.asUser(a.accessToken)
console.log('\n۲) بررسی اینکه session واقعاً کار می‌کند (کنترل مثبت)')
const me = await restA.get('/auth/v1/user')
console.log('   /auth/v1/user →', me.status, me.json?.email)

console.log('\n۳) ساخت fixture برای A')
const fixtures = await createFixture(restA, a.id, { boards: 1, columnsPerBoard: 2, cardsPerColumn: 2 })
const f = fixtures[0]
console.log('   board :', f.board.id, '→', f.board.title)
console.log('   columns:', f.columns.map((c) => c.id).join(', '))
console.log('   cards  :', f.cards.map((c) => c.id).join(', '))

console.log('\n۴) کنترل مثبت: A باید بتواند چیزی را که ساخته ببیند')
for (const t of ['boards', 'columns', 'cards']) {
  const r = await restA.get(`/rest/v1/${t}?select=id,title&limit=50`)
  console.log(`   ${t}: status=${r.status} rows=${r.rows}`)
}

console.log('\n۵) ساخت User B')
const b = await createUser(url, anonKey, 'B')
const restB = anon.asUser(b.accessToken)
console.log('   id  :', b.id)

console.log('\n۶) B نباید هیچ‌کدام از ردیف‌های A را نبیند')
for (const t of ['boards', 'columns', 'cards']) {
  const r = await restB.get(`/rest/v1/${t}?select=id&limit=50`)
  console.log(`   ${t}: status=${r.status} rows=${r.rows} ${r.rows === 0 ? '✔ ایزوله' : '✘ نشت داده!'}`)
}

console.log('\n۷) پاک‌سازی داده‌های A')
const stats = await dropFixture(restA, fixtures)
console.log('   حذف شد:', JSON.stringify(stats))

console.log('\n۸) تأیید پاک‌سازی')
for (const t of ['boards', 'columns', 'cards']) {
  const r = await restA.get(`/rest/v1/${t}?select=id&limit=50`)
  console.log(`   ${t}: rows=${r.rows}`)
}

console.log('\n--- کاربران auth ساخته‌شده (بدون service_role قابل حذف نیستند) ---')
console.log('  A:', a.email)
console.log('  B:', b.email)
console.log('  ایمیل‌ها با example.test هستند تا بی‌خطر باشند.')
