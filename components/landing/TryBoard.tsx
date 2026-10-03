"use client";

import { useState } from "react";
import { CheckCircleIcon } from "@/components/ui/icons";

const COLS = ["نیازمند بررسی", "در حال اجرا", "تکمیل‌شده"];
const FA = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const fa = (n: number) => String(n).replace(/\d/g, (d) => FA[+d]);

const INITIAL = [
  { id: 1, title: "آماده‌سازی شرح نیازمندی‌ها", col: 0 },
  { id: 2, title: "بازبینی مسیر ثبت‌نام", col: 0 },
  { id: 3, title: "ساخت نسخه‌ی آزمایشی", col: 1 },
  { id: 4, title: "انتشار راهنمای آغاز کار", col: 2 },
];

export default function TryBoard() {
  const [cards, setCards] = useState(INITIAL);
  const [touched, setTouched] = useState(false);

  const move = (id: number) => {
    setTouched(true);
    setCards((all) =>
      all.map((c) => (c.id === id ? { ...c, col: (c.col + 1) % 3 } : c)),
    );
  };

  const done = cards.filter((c) => c.col === 2).length;
  const progress = Math.round((done / cards.length) * 100);

  return (
    <div className="relative">
      {/* sticky-note hint */}
      <div
        aria-hidden="true"
        className={`absolute -top-4 inset-s-3 z-10 -rotate-3 rounded-lg bg-warning/15 px-3 py-1.5 text-chip font-semibold text-text shadow-sm transition-all duration-300 ${
          touched ? "translate-y-1 opacity-0" : "animate-pulse"
        }`}
      >
        👆 روی یک کارت بزنید!
      </div>

      <div className="rounded-[20px] border border-border bg-surface p-2 shadow-lg transition-transform duration-300 lg:rotate-1 lg:hover:rotate-0 sm:p-3">
        <div className="rounded-2xl border border-border bg-bg p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-subtitle font-semibold text-text">
              پروژه‌ی وب‌سایت
            </p>
            <div className="flex items-center gap-2">
              <span className="tabular text-meta text-text-2">
                {fa(progress)}٪
              </span>
              <div
                role="progressbar"
                aria-label="پیشرفت پروژه"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="h-2 w-20 overflow-hidden rounded-full bg-surface-2"
              >
                <div
                  className="h-full rounded-full bg-success transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* mobile: swipeable columns / desktop: grid */}
          <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
            {COLS.map((title, ci) => (
              <div
                key={title}
                role="group"
                aria-label={title}
                className="min-w-[78%] snap-center rounded-xl bg-surface p-2.5 sm:min-w-0"
              >
                <p className="mb-2 px-1 text-meta font-semibold text-text-2">
                  {title}
                  <span className="ms-1.5 tabular">
                    {fa(cards.filter((c) => c.col === ci).length)}
                  </span>
                </p>

                <div className="flex min-h-24 flex-col gap-2">
                  {cards
                    .filter((c) => c.col === ci)
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        aria-label={`${c.title}، در ستون «${title}». برای انتقال به مرحله‌ی بعد فعال کنید.`}
                        onClick={() => move(c.id)}
                        className="flex items-start gap-1.5 rounded-lg border border-border bg-bg p-2.5 text-start text-meta font-medium leading-5 text-text shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:scale-95"
                      >
                        {ci === 2 && (
                          <CheckCircleIcon
                            size={14}
                            className="mt-0.5 shrink-0 text-success"
                          />
                        )}
                        {c.title}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p aria-live="polite" className="mt-3 text-center text-chip text-text-muted">
        {done === cards.length
          ? "همه‌ی کارها تمام شد 🎉 حالا بورد خودتان را بسازید"
          : "با هر کلیک، کارت به مرحله‌ی بعد می‌رود"}
      </p>
    </div>
  );
}