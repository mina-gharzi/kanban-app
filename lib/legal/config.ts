/**
 * اطلاعات صفحه‌های «حریم خصوصی» و «قوانین». این‌ها را خودتان پر کنید؛ تا خالی
 * باشند، صفحه‌ها بالای خود یک اخطار می‌گذارند (و نباید با این وضعیت منتشر شوند).
 *
 * نسخه‌ی قوانین (`termsVersion`) هنگام ثبت‌نام در `user_metadata` کاربر ذخیره
 * می‌شود؛ هر بار متن را به‌طور اساسی عوض کردید، تاریخ و نسخه را هم عوض کنید.
 */
export type LegalConfig = {
  serviceName: string
  /** شخص یا شرکتی که سرویس را اداره می‌کند (نام کامل) */
  operatorName: string
  /** ایمیلی که کاربران برای حریم خصوصی/حذف/پشتیبانی به آن می‌نویسند */
  contactEmail: string
  /** قانون و مرجع رسیدگی، مثلاً «قوانین جمهوری اسلامی ایران» یا «قوانین آلمان» */
  governingLaw: string
  /** سرویس ایمیل (SMTP) که برای تأیید ثبت‌نام و بازیابی رمز استفاده می‌کنید؛ اگر نمی‌خواهید ذکر شود خالی بگذارید */
  emailProvider: string
  /** منطقه‌ی دیتابیس Supabase (مثلاً «فرانکفورت، اتحادیه‌ی اروپا») و میزبانی Vercel */
  databaseRegion: string
  lastUpdated: string // YYYY-MM-DD
  termsVersion: string
}

export const LEGAL: LegalConfig = {
  serviceName: 'کانبان',
  operatorName: 'Mina Gharzi',
  contactEmail: 'minagharzipv@gmail.com',
  governingLaw: 'قوانین جمهوری اسلامی ایران',
  emailProvider: 'Supabase Auth',
  databaseRegion: 'اتحادیه اروپا (Supabase)',
  lastUpdated: '2026-10-05',
  termsVersion: '2026-10-05',
}

/** فیلدهایی که بدون آن‌ها صفحه‌ی حقوقی ناقص است */
export const REQUIRED_LEGAL_FIELDS = ['operatorName', 'contactEmail', 'governingLaw'] as const

/** دامنه‌هایی که فقط نمونه/آزمایشی‌اند و نباید به‌عنوان ایمیل تماس منتشر شوند */
const PLACEHOLDER_EMAIL_DOMAINS = ['example.com', 'example.org', 'example.net', 'test.com', 'localhost']

/**
 * آیا این مقدار یک ایمیل واقعی است؟ خالی، ساختار نامعتبر، یا دامنه‌ی نمونه
 * (مثل `contact@example.com`) یعنی هنوز پر نشده است.
 */
export function isRealEmail(value: string): boolean {
  const email = value.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false
  const domain = email.slice(email.lastIndexOf('@') + 1)
  return !PLACEHOLDER_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))
}

function isFieldFilled(key: (typeof REQUIRED_LEGAL_FIELDS)[number], config: LegalConfig): boolean {
  const value = config[key].trim()
  if (value === '') return false
  return key === 'contactEmail' ? isRealEmail(value) : true
}

export function missingLegalFields(config: LegalConfig = LEGAL): string[] {
  return REQUIRED_LEGAL_FIELDS.filter((key) => !isFieldFilled(key, config))
}

export function isLegalConfigured(config: LegalConfig = LEGAL): boolean {
  return missingLegalFields(config).length === 0
}
