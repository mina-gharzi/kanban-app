import { LEGAL } from '@/lib/legal/config'

/** ایمیل تماس (یا یادآوری پر نشدن آن) */
export default function Contact() {
  const email = LEGAL.contactEmail.trim()
  return email ? <a href={`mailto:${email}`} dir="ltr">{email}</a> : <strong>[ایمیل تماس تنظیم نشده]</strong>
}
