import type { ReactNode } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import TryBoard from "@/components/landing/TryBoard";
import {
  BoardsIcon,
  CalendarIcon,
  CardIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ColumnIcon,
  LiveIcon,
} from "@/components/ui/icons";
import { LABEL_COLORS } from "@/lib/labelColors";

const STEPS = [
  {
    n: "۱",
    title: "بورد بسازید",
    text: "فقط با ایمیل؛ فضای کار تیم در چند ثانیه آماده است.",
    icon: BoardsIcon,
  },
  {
    n: "۲",
    title: "ستون‌ها را بچینید",
    text: "مراحل واقعی کارتان را به ستون تبدیل کنید.",
    icon: ColumnIcon,
  },
  {
    n: "۳",
    title: "کارت‌ها را حرکت دهید",
    text: "برچسب بزنید، سررسید بگذارید و پیشرفت را ببینید.",
    icon: CheckCircleIcon,
  },
] as const;

const FEATURES = [
  {
    title: "ستون‌بندی انعطاف‌پذیر",
    text: "هر تیم مسیر خودش را دارد؛ ستون‌ها را هر طور که کارتان می‌چرخد بسازید.",
    icon: ColumnIcon,
    span: "sm:col-span-4",
  },
  {
    title: "هم‌زمانی لحظه‌ای",
    text: "تغییر یک نفر، بدون تازه‌سازی، پیش چشم همه.",
    icon: LiveIcon,
    span: "sm:col-span-2",
    hot: true,
  },
  {
    title: "کارت‌های اطلاعاتی",
    text: "عنوان، توضیح، برچسب و سررسید در یک کارت.",
    icon: CardIcon,
    span: "sm:col-span-2",
  },
  {
    title: "جست‌وجو و فیلتر",
    text: "با عنوان یا برچسب، فقط کارِ مهم را ببینید.",
    icon: BoardsIcon,
    span: "sm:col-span-4",
  },
] as const;

const CHAOS = [
  "«فایل آخر کدام بود؟»",
  "پیگیری در چت",
  "یادآوری فراموش‌شده",
  "کی این را انجام می‌دهد؟",
  "نسخه‌ی نهایی-۳",
];

export default function LandingPage() {
  return (
    <div id="بالا" className="min-h-dvh overflow-x-hidden bg-bg text-text">
      <SiteHeader />
      <main>
        <Hero />
        <ChaosToOrder />
        <Process />
        <Features />
        <CallToAction />
      </main>
      <SiteFooter />
    </div>
  );
}

/* Header: floating pill */
function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <div className="mx-auto flex h-13 max-w-5xl items-center justify-between rounded-full border border-border bg-bg/85 py-2 ps-4 pe-2 shadow-sm backdrop-blur-md">
        <Link href="/" className="group flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary transition-transform group-hover:-rotate-12">
            <BoardsIcon size={16} />
          </span>
          <span className="text-heading font-semibold">کانبان</span>
        </Link>
        <nav className="flex items-center gap-1">
          <a
            href="#امکانات"
            className="hidden rounded-full px-3 py-2 text-body text-text-2 hover:text-text sm:inline-flex"
          >
            امکانات
          </a>
          <Link
            href="/login"
            className={buttonClass({ variant: "ghost", size: "sm" })}
          >
            ورود
          </Link>
          <Link
            href="/register"
            className={buttonClass({ variant: "primary", size: "sm" })}
          >
            شروع کنید
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* Hero: asymmetric + playable board */
function Hero() {
  return (
    <section className="px-3 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-chip font-medium text-text-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            بدون کارت بانکی، کمتر از یک دقیقه
          </div>
          <h1 className="mt-6 text-balance text-[clamp(2.25rem,8vw,4.25rem)] font-semibold leading-[1.15] tracking-tight">
            <span className="block">کارهای تیم را</span>
            <span className="block text-text-muted">
              همین‌جا{" "}
              <span className="underline decoration-success decoration-4 underline-offset-8">
                جابه‌جا
              </span>{" "}
              کنید
            </span>
          </h1>
          <p className="mt-5 max-w-md text-body leading-7 text-text-2 sm:text-heading sm:leading-8">
            یک بورد بسازید و جریان کار تیم را ساده‌تر و شفاف‌تر مدیریت کنید.
          </p>
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <Link
              href="/register"
              className={`${buttonClass({ variant: "primary", size: "md" })} w-full sm:w-auto`}
            >
              بورد خودتان را بسازید
            </Link>
            <a
              href="#روش-کار"
              className={`${buttonClass({ variant: "secondary", size: "md" })} w-full sm:w-auto`}
            >
              روش کار <ChevronDownIcon size={16} />
            </a>
          </div>
        </div>
        <TryBoard />
      </div>
    </section>
  );
}

/* Chaos → Order: the "aha" section */
function ChaosToOrder() {
  const tilts = ["-rotate-3", "rotate-2", "-rotate-1", "rotate-3", "-rotate-2"];
  return (
    <section className="bg-surface px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionLabel>مشکل آشناست</SectionLabel>
        <h2 className="mt-3 max-w-xl text-title font-semibold">
          کارها یا در چت گم می‌شوند، یا در ذهن.
        </h2>

        <div className="mt-10 grid items-stretch gap-4 md:grid-cols-2">
          <div className="relative min-h-56 overflow-hidden rounded-3xl border border-dashed border-border bg-bg p-5">
            <p className="mb-4 text-meta font-semibold text-text-2">
              قبل از کانبان
            </p>
            <div className="flex flex-wrap gap-2.5">
              {CHAOS.map((c, i) => (
                <span
                  key={c}
                  className={`${tilts[i]} rounded-lg px-3 py-2 text-meta shadow-sm`}
                  style={{
                    backgroundColor:
                      LABEL_COLORS[i % LABEL_COLORS.length].value,
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-bg p-5 shadow-md">
            <p className="mb-4 text-meta font-semibold text-success">
              با کانبان
            </p>
            <ul className="flex flex-col gap-2">
              {[
                "نسخه‌ی نهایی در کارت",
                "وضعیت روی بورد",
                "سررسید روی کارت",
              ].map((t) => (
                <li
                  key={t}
                  className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-body"
                >
                  <CheckCircleIcon
                    size={15}
                    className="shrink-0 text-success"
                  />
                  {t}
                </li>
              ))}
              <li className="flex items-center gap-2 rounded-xl bg-warning/10 px-3 py-2.5 text-body">
                <CalendarIcon size={15} className="shrink-0 text-warning" />
                فردا، ۱۰:۰۰ — ارائه
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Process: staggered steps joined by a dashed line */
function Process() {
  const offsets = ["", "md:translate-y-8", "md:translate-y-16"];
  return (
    <section id="روش-کار" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionLabel>روش کار</SectionLabel>
        <h2 className="mt-3 max-w-xl text-title font-semibold">
          سه قدم تا اولین کارِ انجام‌شده
        </h2>

        <div className="relative mt-12 grid gap-4 md:grid-cols-3 md:pb-16">
          <div
            aria-hidden
            className="absolute inset-x-10 top-10 hidden border-t-2 border-dashed border-border md:block"
          />
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className={`group relative rounded-2xl border border-border bg-surface p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md sm:p-6 ${offsets[i]}`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-on-primary">
                  <Icon size={18} />
                </span>
                <span className="absolute inset-e-4 top-2 select-none text-[56px] font-bold leading-none text-border">
                  {s.n}
                </span>
                <h3 className="mt-6 text-heading font-semibold">{s.title}</h3>
                <p className="mt-2 text-body leading-6 text-text-2">{s.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* Features: bento */
function Features() {
  return (
    <section
      id="امکانات"
      className="scroll-mt-20 bg-surface px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <SectionLabel>امکانات</SectionLabel>
        <h2 className="mt-3 max-w-xl text-title font-semibold">
          ابزاری که کنار شماست، نه سر راه شما
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            const hot = "hot" in f;
            return (
              <div
                key={f.title}
                className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md sm:p-7 ${f.span} ${
                  hot
                    ? "border-transparent bg-primary text-on-primary"
                    : "border-border bg-bg shadow-xs"
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${hot ? "bg-on-primary/15" : "bg-surface text-primary shadow-xs"}`}
                >
                  <Icon size={18} />
                </span>
                <h3 className="mt-6 text-heading font-semibold">{f.title}</h3>
                <p
                  className={`mt-2 max-w-md text-body leading-6 ${hot ? "opacity-85" : "text-text-2"}`}
                >
                  {f.text}
                </p>
                {hot && (
                  <span className="absolute inset-e-5 top-5 h-2.5 w-2.5 animate-ping rounded-full bg-success" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* CTA */
function CallToAction() {
  return (
    <section className="px-3 py-16 sm:px-6 sm:py-24">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[28px] bg-primary px-5 py-12 text-center text-on-primary sm:px-10 sm:py-16">
        <span
          aria-hidden
          className="absolute inset-s-6 top-6 hidden -rotate-6 rounded-lg bg-surface px-3 py-2 text-meta text-text shadow-md sm:block"
        >
          ✅ تکمیل شد
        </span>
        <span
          aria-hidden
          className="absolute bottom-6 inset-e-6 hidden rotate-6 rounded-lg bg-warning/90 px-3 py-2 text-meta text-text shadow-md sm:block"
        >
          فردا، ۱۰:۰۰
        </span>

        <h2 className="mx-auto max-w-xl text-balance text-title font-semibold">
          اولین کارت بورد شما منتظر است.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-body leading-6 opacity-85">
          حساب بسازید، تیم را دعوت کنید و همین امروز کارها را مرتب کنید.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <Link
            href="/register"
            className={`${buttonClass({ variant: "secondary", size: "md" })} w-full sm:w-auto`}
          >
            ساخت حساب رایگان
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 text-body underline-offset-4 hover:underline"
          >
            قبلاً حساب دارم
          </Link>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="flex items-center gap-2 text-body font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary">
            <BoardsIcon size={15} />
          </span>
          کانبان
        </span>
        <div className="flex flex-wrap gap-x-5 text-meta text-text-2">
          <Link href="/login" className="py-2 hover:text-text">
            ورود
          </Link>
          <Link href="/register" className="py-2 hover:text-text">
            ثبت‌نام
          </Link>
          <a href="#بالا" className="py-2 hover:text-text">
            بازگشت به بالا
          </a>
        </div>
      </div>
    </footer>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-chip font-medium text-text-2">{children}</p>;
}
