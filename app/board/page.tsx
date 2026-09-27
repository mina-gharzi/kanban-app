import { redirect } from 'next/navigation'

/**
 * `/board` بدون شناسه بورد مسیر معتبری نیست. به‌جای 404 خام، کاربر را به
 * فهرست بوردها می‌فرستیم — همان کاری که برای هر مسیر نامعتبر دیگر انجام
 * می‌شود و بهتر از صفحه‌ی خطای بی‌معنی است.
 */
export default function BoardIndexPage() {
  redirect('/')
}
