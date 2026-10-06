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
  contactEmail: 'contact@example.com',
  governingLaw: 'قوانین جمهوری اسلامی ایران',
  emailProvider: 'Supabase Auth',
  databaseRegion: 'اتحادیه اروپا (Supabase)',
  lastUpdated: '2026-10-05',
  termsVersion: '2026-10-05',
}

/** فیلدهایی که بدون آن‌ها صفحه‌ی حقوقی ناقص است */
export const REQUIRED_LEGAL_FIELDS = ['operatorName', 'contactEmail', 'governingLaw'] as const

export function missingLegalFields(config: LegalConfig = LEGAL): string[] {
  return REQUIRED_LEGAL_FIELDS.filter((key) => config[key].trim() === '')
}

export function isLegalConfigured(config: LegalConfig = LEGAL): boolean {
  return missingLegalFields(config).length === 0
}
