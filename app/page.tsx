import Link from 'next/link'
import { buttonClass } from '@/components/ui/Button'
import { BoardsIcon, ColumnIcon, CardIcon, LiveIcon } from '@/components/ui/icons'

/**
 * صفحه‌ی معرفی — عمومی، بدون AuthGuard.
 *
 * چرا اینجا AuthGuard نیست: این صفحه باید برای کاربر مهمان هم رندر شود
 * (کل هدفش همین است). محافظت از مسیرهای واقعی همچنان روی `/boards` و
 * `/board/*` برقرار است؛ کاربرِ از‌قبل واردشده هم با همان middleware
 * مستقیم به `/boards` هدایت می‌شود، نه اینکه این صفحه را ببیند.
 */
export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-on-primary">
            <BoardsIcon size={17} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-text">
            کانبان
          </span>
        </div>

        <nav className="flex items-center gap-2">
          <Link href="/login" className={buttonClass({ variant: 'ghost', size: 'sm' })}>
            ورود
          </Link>
          <Link href="/register" className={buttonClass({ variant: 'primary', size: 'sm' })}>
            ثبت‌نام رایگان
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center sm:px-6">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-text sm:text-4xl">
            کارهای تیمت رو یه‌جا، شفاف و بدون گم‌شدن مدیریت کن
          </h1>
          <p className="max-w-xl text-balance text-[15px] leading-7 text-text-2">
            یک بورد کانبان ساده و زنده: بکش، رها کن، بساز. تغییرات همه‌ی
            هم‌تیمی‌ها همون لحظه روی صفحه‌ی هم می‌بینن.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className={buttonClass({ variant: 'primary', size: 'md', className: 'px-6' })}
          >
            رایگان شروع کن
          </Link>
          <Link
            href="/login"
            className={buttonClass({ variant: 'secondary', size: 'md', className: 'px-6' })}
          >
            وارد حساب موجود شو
          </Link>
        </div>

        <dl className="mt-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <Feature
            icon={<ColumnIcon size={18} />}
            title="ستون‌های دلخواه"
            description="هر مرحله از کار رو با ستون‌های خودت بساز، هر جور که تیمت کار می‌کنه."
          />
          <Feature
            icon={<CardIcon size={18} />}
            title="کارت‌های کامل"
            description="توضیح، لیبل و تاریخ سررسید — همه چیزی که یه کارت لازم داره."
          />
          <Feature
            icon={<LiveIcon size={18} />}
            title="همگام‌سازی زنده"
            description="جابه‌جایی هر کارت، همون لحظه برای بقیه‌ی اعضای بورد هم دیده می‌شه."
          />
        </dl>
      </main>
    </div>
  )
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-5 text-center shadow-xs">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
        {icon}
      </span>
      <dt className="text-[13px] font-semibold text-text">{title}</dt>
      <dd className="text-[13px] leading-6 text-text-muted">{description}</dd>
    </div>
  )
}