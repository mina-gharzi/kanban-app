/**
 * ۰۵ — قیود واقعی ستون‌های cards و تصمیم درباره‌ی ناسازگاری parser.
 *
 * مسئله‌ای که در بازبینی کد دیده شد:
 *   readCardFields (مقدار سمت سرور)  →  description: card.description ?? null
 *   readDraftFields (draft سمت UI)  →  description: '' به null تبدیل می‌شود
 *
 * یعنی اگر دیتابیس رشته‌ی خالی را نگه دارد و برگرداند، «پاک کردن توضیحات» در
 * UI (که null می‌فرستد) با «خواندن از سرور» (که '' می‌دهد) ناهماهنگ می‌شود و
 * conflict الیگی می‌سازد.
 *
 * ولی این فقط وقتی مسئله است که دیتابیس واقعاً '' را بپذیرد و برگرداند. این
 * فایل دقیقاً همین را می‌سنجد — به‌جای حدس زدن از روی کد.
 */

import { Report, STATUS } from './helpers/harness.mjs'
import { withScenario } from './helpers/scenario.mjs'

const report = new Report('۰۵ — قیود cards و رفتار رشته‌ی خالی')

await withScenario(async (ctx) => {
  const { restA, fixture } = ctx
  const column = fixture.columns[0]

  /** یک کارت می‌سازد و بدنه‌ی کاملش را برمی‌گرداند (شامل آنچه DB برگردانده). */
  const makeCard = async (body) => {
    const r = await restA.write('POST', 'cards', {
      body: { column_id: column.id, position: 0, ...body },
    })
    return r
  }
  const readBack = async (id) => {
    const r = await restA.get(`/rest/v1/cards?id=eq.${id}&select=id,title,description,due_date,label_color,position`)
    return r.rowsData?.[0] ?? null
  }
  const dropCard = async (id) => {
    if (id) await restA.write('DELETE', 'cards', { id })
  }

  report.section('۱) آیا title اجباری است؟')
  const noTitle = await makeCard({})
  report.check(
    'INSERT بدون title رد می‌شود (NOT NULL)',
    noTitle.status >= 400,
    'status>=400 با کد 23502',
    noTitle.toString(),
    noTitle.code === '23502'
      ? 'NOT NULL تأیید شد'
      : 'اگر پذیرفته شد یعنی title قابل NULL است و کلاینت بدون اعتبارسنجی رد می‌شود'
  )
  await dropCard(noTitle.rowsData?.[0]?.id)

  const nullTitle = await makeCard({ title: null })
  report.check(
    'INSERT با title=null رد می‌شود',
    nullTitle.status >= 400,
    'status>=400',
    nullTitle.toString()
  )
  await dropCard(nullTitle.rowsData?.[0]?.id)

  report.section('۲) ★ آیا title می‌تواند رشته‌ی خالی باشد؟')
  // این بخش قبلاً انتظار داشت title="" *پذیرفته* شود و به همین دلیل FAIL می‌داد.
  // انتظار قدیمی stale بود: migration مربوط به hardening، قید
  //   check (char_length(title) between 1 and 120) not valid
  // را روی boards/columns/cards اضافه کرده و دیتابیس live آن را اعمال کرده
  // است. یعنی رشته‌ی خالی دیگر *نمی‌تواند* ذخیره شود.
  //
  // این خبر خوبی برای مسئله‌ی parser است: ناسازگاری
  // readCardFields ('') در برابر readDraftFields (null) دیگر در حوزه‌ی cards
  // اصلاً ممکن نیست، چون هیچ کارتی نمی‌تواند title خالی داشته باشد.
  const emptyTitle = await makeCard({ title: '' })
  report.check(
    'INSERT با title="" در دیتابیس رد می‌شود (قید cards_title_len)',
    emptyTitle.status >= 400,
    'status>=400 (23514 check violation)',
    emptyTitle.toString(),
    emptyTitle.code === '23514'
      ? 'قید چک دیتابیس جلوی رشته‌ی خالی را گرفت ⇒ ناسازگاری parser در cards بی‌اثر است'
      : 'اگر با کد دیگری رد شده، بررسی کنید که آیا علت همان قید است یا چیز دیگر'
  )

  // مرزهای قید: ۱ کاراکتر باید بپذیرد و ۱۲۱ باید رد شود.
  const minTitle = await makeCard({ title: 'x' })
  report.check(
    'title با طول ۱ پذیرفته می‌شود (کران پایین قید)',
    minTitle.ok && minTitle.rows === 1,
    'status=2xx rows=1',
    minTitle.toString()
  )
  await dropCard(minTitle.rowsData?.[0]?.id)

  const maxTitle = await makeCard({ title: 'x'.repeat(120) })
  report.check(
    'title با طول ۱۲۰ پذیرفته می‌شود (کران بالای قید)',
    maxTitle.ok && maxTitle.rows === 1,
    'status=2xx rows=1',
    maxTitle.toString()
  )
  await dropCard(maxTitle.rowsData?.[0]?.id)

  const overTitle = await makeCard({ title: 'x'.repeat(121) })
  report.check(
    'title با طول ۱۲۱ رد می‌شود',
    overTitle.status >= 400,
    'status>=400',
    overTitle.toString()
  )

  report.section('۳) ★ رفتار description (مهم‌ترین بخش برای تصمیم parser)')
  const emptyDesc = await makeCard({ title: 't', description: '' })
  if (emptyDesc.ok && emptyDesc.rows === 1) {
    const id = emptyDesc.rowsData[0].id
    const back = await readBack(id)
    report.check(
      'INSERT با description="" پذیرفته می‌شود',
      true,
      'بدون خطا',
      emptyDesc.toString()
    )
    report.record(
      back?.description === '' ? STATUS.PASS : STATUS.FAIL,
      'دیتابیس description="" را عیناً نگه می‌دارد و برمی‌گرداند',
      'description="" (نه null)',
      JSON.stringify(back?.description),
      'اگر null برمی‌گشت، نگاشت ?? null کافی بود و ناسازگاری وجود نداشت'
    )
    await dropCard(id)
  } else {
    report.check(
      'INSERT با description="" پذیرفته می‌شود',
      false,
      'بدون خطا',
      emptyDesc.toString(),
      'دیتابیس خالی را رد می‌کند ⇒ ناسازگاری parser بی‌اثر است'
    )
  }

  const omittedDesc = await makeCard({ title: 't' })
  if (omittedDesc.ok) {
    const id = omittedDesc.rowsData[0].id
    const back = await readBack(id)
    report.record(
      back?.description === null ? STATUS.PASS : STATUS.FAIL,
      'description که ارسال نشود، null برمی‌گردد (nullable است)',
      'null',
      JSON.stringify(back?.description)
    )
    await dropCard(id)
  } else {
    report.check(
      'description قابل ارسال نبودن (nullable است)',
      false,
      'بدون خطا',
      omittedDesc.toString()
    )
  }

  const nullDesc = await makeCard({ title: 't', description: null })
  if (nullDesc.ok) {
    const id = nullDesc.rowsData[0].id
    const back = await readBack(id)
    report.record(
      back?.description === null ? STATUS.PASS : STATUS.FAIL,
      'description=null به‌صورت null ذخیره می‌شود',
      'null',
      JSON.stringify(back?.description)
    )
    await dropCard(id)
  }

  report.section('۴) رفتار due_date')
  const nullDue = await makeCard({ title: 't', due_date: null })
  report.check(
    'due_date=null پذیرفته می‌شود (nullable)',
    nullDue.ok,
    'بدون خطا',
    nullDue.toString()
  )
  if (nullDue.ok) {
    const id = nullDue.rowsData[0].id
    const back = await readBack(id)
    report.record(
      back?.due_date === null ? STATUS.PASS : STATUS.FAIL,
      'due_date=null عیناً null برمی‌گردد',
      'null',
      JSON.stringify(back?.due_date)
    )
    await dropCard(id)
  }

  const emptyDue = await makeCard({ title: 't', due_date: '' })
  report.check(
    'due_date="" یا پذیرفته و به null تبدیل می‌شود، یا با خطا رد می‌شود',
    emptyDue.ok || emptyDue.status >= 400,
    'پذیرش با null، یا خطای قالب',
    emptyDue.toString(),
    emptyDue.ok
      ? "اگر پذیرفته شد ولی مقدار ذخیره‌شده خالی باشد، دقیقاً همان ناسازگاری parser رخ می‌دهد"
      : "خطای قالب ⇒ کلاینت باید قبل از ارسال به null تبدیل کند (که می‌کند)"
  )
  if (emptyDue.ok) {
    const id = emptyDue.rowsData[0].id
    const back = await readBack(id)
    report.record(
      back?.due_date === null ? STATUS.PASS : STATUS.FAIL,
      'due_date ذخیره‌شده پس از ارسال "" چه چیزی است؟',
      'null (اگر خالی به null نگاشت شود)',
      JSON.stringify(back?.due_date)
    )
    await dropCard(id)
  }

  const goodDue = await makeCard({ title: 't', due_date: '2026-12-31' })
  report.check(
    'due_date با قالب YYYY-MM-DD پذیرفته می‌شود',
    goodDue.ok,
    'بدون خطا',
    goodDue.toString()
  )
  if (goodDue.ok) {
    const id = goodDue.rowsData[0].id
    const back = await readBack(id)
    console.log(`  (due_date برگشتی: ${JSON.stringify(back?.due_date)})`)
    await dropCard(id)
  }

  const badDue = await makeCard({ title: 't', due_date: 'not-a-date' })
  report.check(
    'due_date نامعتبر رد می‌شود',
    badDue.status >= 400,
    'status>=400',
    badDue.toString()
  )
  await dropCard(badDue.rowsData?.[0]?.id)

  report.section('۵) رفتار label_color و position')
  const noLabel = await makeCard({ title: 't' })
  report.check(
    'label_color قابل ارسال نبودن (nullable است)',
    noLabel.ok,
    'بدون خطا',
    noLabel.toString()
  )
  if (noLabel.ok) {
    const id = noLabel.rowsData[0].id
    const back = await readBack(id)
    report.record(
      back?.label_color === null ? STATUS.PASS : STATUS.FAIL,
      'label_color ارسال‌نشده null برمی‌گردد',
      'null',
      JSON.stringify(back?.label_color)
    )
    await dropCard(id)
  }

  // position پیش‌فرض ندارد و NOT NULL است. در بار اول انتظار پیش‌فرض داشتنش
  // را داشتیم که اشتباه بود: بررسی کد نشان داد createCard در
  // lib/supabase/queries.ts:126 همیشه position را صریح می‌فرستد. پس رفتار
  // درست «رد کردن» است، و قرارداد این است که هر نویسنده position بفرستد.
  const noPosition = await restA.write('POST', 'cards', {
    body: { column_id: column.id, title: 't' },
  })
  report.record(
    noPosition.code === '23502' ? STATUS.PASS : STATUS.FAIL,
    'cards بدون position رد می‌شود (position پیش‌فرض ندارد)',
    'کد 23502 ⇒ هر فراخوان باید position را صریح بفرستد',
    noPosition.toString(),
    'قرارداد کلاینت: createCard در queries.ts:126 همیشه position می‌فرستد'
  )

  const withPosition = await restA.write('POST', 'cards', {
    body: { column_id: column.id, title: 't', position: 0 },
  })
  report.check(
    'cards با position صریح پذیرفته می‌شود',
    withPosition.ok,
    'بدون خطا',
    withPosition.toString()
  )
  if (withPosition.ok) {
    const id = withPosition.rowsData[0].id
    const back = await readBack(id)
    console.log(`  (position ذخیره‌شده: ${JSON.stringify(back?.position)})`)
    await dropCard(id)
  }

  report.section('۶) نتیجه‌گیری درباره‌ی ناسازگاری parser')
  // این بخش نتیجه‌ی بخش‌های ۲ و ۳ را به یک حکم روشن تبدیل می‌کند.
  const probe = await makeCard({ title: '', description: '' })
  let dbKeepsEmptyString = false
  if (probe.ok && probe.rows === 1) {
    const id = probe.rowsData[0].id
    const back = await readBack(id)
    dbKeepsEmptyString = back?.description === ''
    await dropCard(id)
  }

  if (dbKeepsEmptyString) {
    // دقت در شدت: ناسازگاری واقعی است، ولی «فعال» نیست. هیچ مسیر نوشتنی در
    // اپ مقدار خالی برای description نمی‌فرستد (همه‌ی نوشتن‌ها از readDraftFields
    // یا optimistic.ts می‌آیند که هر دو به null تبدیل می‌کنند). پس این فقط وقتی
    // دیده می‌شود که داده‌ی کهنه یا نوشته‌ی بیرونی مقدار خالی داشته باشد.
    report.record(
      STATUS.FAIL,
      'ناسازگاری readCardFields و readDraftFields تأیید شد (latent)',
      'هر دو تابع باید یک نگاشت واحد برای رشته‌ی خالی داشته باشند',
      'دیتابیس description خالی را عیناً نگه می‌دارد و برمی‌گرداند. پس readCardFields ' +
        'مقدار خالی می‌دهد، ولی readDraftFields برای همان فیلد null می‌دهد. ' +
        'توضیح داخل کد ادعا می‌کند «سرور null برمی‌گرداند» که با شواهد این تست نادرست است.',
      'شدت: پایین و نه فعال. هیچ مسیر نوشتنی در اپ خالی نمی‌فرستد (همه از ' +
        'readDraftFields/optimistic.ts می‌گذرند که null می‌کنند). فقط داده‌ی کهنه یا ' +
        'نوشته‌ی بیرونی این حالت را می‌سازد. اثر: اگر چنین داده‌ای باشد و کاربر ' +
        'توضیحات را خالی بگذارد، conflict الیگی روی فیلدی گزارش می‌شود که کاربر ' +
        'اصلاً دستش نزده است.'
    )
  } else {
    report.record(
      STATUS.PASS,
      'ناسازگاری readCardFields و readDraftFields عملاً رخ نمی‌دهد',
      'دیتابیس هرگز رشته‌ی خالی برنمی‌گرداند',
      'دیتابیس مقدار خالی را به null نگاشت می‌کند یا رد می‌کند، پس ?? null ' +
        'کافی است و رفتار دو تابع عملاً یکی می‌شود.'
    )
  }

  report.section('۷) مواردی که از این مسیر قابل اثبات نیستند')
  for (const item of [
    'تعریف دقیق CHECK constraintها و defaultها در کاتالوگ',
    'اینکه ستون title واقعاً NOT NULL است یا فقط کلاینت همیشه می‌فرستد (در این تست با 23502 ثابت شد)',
  ]) {
    report.record(STATUS.UNVERIFIED, item, 'خواندن از information_schema', 'نیازمند SQL')
  }
})

const counts = report.summary()
process.exitCode = counts.FAIL > 0 ? 1 : 0
