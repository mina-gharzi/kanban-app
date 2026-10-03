"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import ErrorState from "@/components/ErrorState";
import { useBoardMutations, useBoards } from "@/hooks/useBoards";
import AppShell from "@/components/layout/AppShell";
import BoardSidebar from "@/components/layout/BoardSidebar";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { ColumnIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { boardColor, boardInitial, hashOf } from "@/lib/board/boardColor";
import { readableInk } from "@/lib/labelColors";
import { ROLE_LABELS } from "@/lib/sharing/roles";
import MyInvitesPanel from "@/components/MyInvitesPanel";

/** هش ساده و پایدار از id تا هر بورد هویت بصری ثابت خودش را داشته باشد */

/** پیش‌نمایش کوچک ستون‌ها؛ فقط تزئینی و بر پایه‌ی هش */
function MiniColumns({ seed, color }: { seed: number; color: string }) {
  return (
    <div aria-hidden className="flex h-10 items-end gap-1.5">
      {[0, 1, 2].map((col) => {
        const bars = ((seed >> (col * 3)) % 3) + 1;
        return (
          <div
            key={col}
            className="flex w-9 flex-col gap-1 rounded-md bg-surface-2 p-1"
          >
            {Array.from({ length: bars }, (_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full"
                style={{
                  backgroundColor: i === 0 ? color : undefined,
                  opacity: i === 0 ? 1 : 0.35,
                }}
                data-bar
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function BoardsList() {
  const { boards, isPending, error, refetch } = useBoards();
  const { createBoardAsync, isCreatingBoard, deleteBoard } =
    useBoardMutations();

  const [newTitle, setNewTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  /** guard دابل‌کلیک؛ isCreatingBoard تنها کافی نیست چون فقط بعد از re-render به‌روز می‌شود */
  const creatingRef = useRef(false);

  /** ورودی فقط پس از موفقیت واقعی پاک می‌شود تا در خطا عنوان از دست نرود */
  const submitCreate = useCallback(
    async (rawTitle?: string) => {
      const title = (rawTitle ?? newTitle).trim();
      if (!title || creatingRef.current) return;

      creatingRef.current = true;
      setCreateError(null);
      try {
        await createBoardAsync(title);
        setNewTitle("");
      } catch {
        setCreateError("ساخت بورد انجام نشد. دوباره تلاش کنید.");
      } finally {
        creatingRef.current = false;
      }
    },
    [createBoardAsync, newTitle],
  );

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    void submitCreate();
  }

  const focusInput = () => document.getElementById("new-board-title")?.focus();

  return (
    <AppShell
      sidebar={BoardSidebar}
      headerMeta={<span className="text-meta text-text-2">بوردهای من</span>}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
          {/* پنل بالایی: عنوان + ساخت سریع */}
          <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 sm:p-8">
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full text-border opacity-60"
            >
              <defs>
                <pattern
                  id="boards-dots"
                  width="16"
                  height="16"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="2" cy="2" r="1.25" fill="currentColor" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#boards-dots)" />
            </svg>

            <div className="relative grid items-end gap-6 md:grid-cols-[1fr_1.1fr]">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg px-2.5 py-1 text-xs text-text-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  {isPending
                    ? "در حال بارگذاری…"
                    : `${boards.length.toLocaleString("fa-IR")} بورد فعال`}
                </span>
                <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-text sm:text-3xl">
                  فضای کاری  <span className="text-text-muted">شما</span> 
                </h1>
              </div>

              <form
                onSubmit={handleCreate}
                className="rounded-2xl border border-border bg-bg p-3 shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Field
                    id="new-board-title"
                    label="بورد جدید"
                    error={createError}
                    className="flex-1"
                  >
                    {({ id, describedBy, invalid }) => (
                      <Input
                        id={id}
                        aria-describedby={describedBy}
                        invalid={invalid}
                        value={newTitle}
                        disabled={isCreatingBoard}
                        onChange={(event) => {
                          setNewTitle(event.target.value);
                          if (createError) setCreateError(null);
                        }}
                        placeholder="مثلاً: برنامه‌ی فصل"
                      />
                    )}
                  </Field>
                  <Button
                    type="submit"
                    className="sm:self-end"
                    loading={isCreatingBoard}
                    disabled={isCreatingBoard}
                  >
                    <PlusIcon size={16} />
                    {isCreatingBoard ? "در حال ساخت…" : "ساخت بورد"}
                  </Button>
                </div>
              </form>
            </div>
          </section>

          <MyInvitesPanel />

          <div className="mt-8">
            {isPending ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <li key={index}>
                    <Skeleton className="h-40 w-full rounded-2xl" />
                  </li>
                ))}
              </ul>
            ) : error ? (
              <ErrorState error={error} onRetry={refetch} />
            ) : boards.length === 0 ? (
              <EmptyState
                icon={<ColumnIcon size={22} />}
                title="هنوز بوردی نساخته‌اید"
                description="اولین بورد را بسازید، بعد ستون و کارت اضافه کنید. با هر بورد می‌توانید کارهای یک پروژه را جدا نگه دارید."
                action={
                  newTitle.trim() ? (
                    <Button
                      onClick={() => void submitCreate()}
                      loading={isCreatingBoard}
                      disabled={isCreatingBoard}
                    >
                      ساخت «{newTitle.trim()}»
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {boards.map((board) => {
                  const seed = hashOf(board.id);
                  const color = boardColor(board.id);
                  return (
                    <li key={board.id}>
                      <div className="group relative flex h-40 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-xs transition-all duration-200 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-[rgb(var(--ring))] hover:-translate-y-1 hover:border-border-2 hover:shadow-md">
                        {/* نوار رنگی هویت بورد */}
                        <span
                          aria-hidden
                          className="absolute inset-x-0 top-0 h-1 origin-right scale-x-30 transition-transform duration-300 group-hover:scale-x-100"
                          style={{ backgroundColor: color }}
                        />

                        <Link
                          href={`/board/${board.id}`}
                          className="flex min-w-0 items-start gap-3 rounded after:absolute after:inset-0 focus-visible:outline-none"
                        >
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-text"
                            style={{ backgroundColor: color, color: readableInk(color) }}
                          >
                            {boardInitial(board.title)}
                          </span>
                          <span className="min-w-0">
                            <h2 className="truncate text-sm font-semibold text-text group-hover:text-primary">
                              {board.title}
                            </h2>
                            <p className="mt-1 text-xs text-text-muted">
                              ساخته‌شده{" "}
                              {new Date(board.created_at).toLocaleDateString(
                                "fa-IR",
                              )}
                            </p>
                            {board.role && board.role !== "owner" && (
                              <p className="mt-0.5 text-chip text-primary">
                                اشتراکی · {ROLE_LABELS[board.role]}
                              </p>
                            )}
                          </span>
                        </Link>

                        <MiniColumns seed={seed} color={color} />

                        {/* بالاتر از لینک کشیده‌شده (z-10) تا کلیک‌پذیر بماند */}
                        {(board.role ?? "owner") === "owner" && (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(board.id)}
                          aria-label={`حذف بورد ${board.title}`}
                          className="absolute bottom-3 inset-e-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-text-muted opacity-0 transition-all duration-150 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
                        >
                          <TrashIcon size={15} />
                        </button>
                        )}
                      </div>
                    </li>
                  );
                })}

                {/* کاشی «بورد جدید» */}
                <li>
                  <button
                    type="button"
                    onClick={focusInput}
                    className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-text-2 transition-all duration-200 hover:-translate-y-1 hover:border-primary hover:text-primary"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2">
                      <PlusIcon size={16} />
                    </span>
                    <span className="text-sm font-medium">بورد جدید</span>
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="حذف بورد"
          description={`بورد «${boards.find((board) => board.id === pendingDelete)?.title ?? ""}» و همه‌ی ستون‌ها و کارت‌های آن برای همیشه حذف می‌شود. این عمل قابل بازگشت نیست.`}
          confirmLabel="حذف بورد"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteBoard(pendingDelete);
            setPendingDelete(null);
          }}
        />
      )}
    </AppShell>
  );
}
