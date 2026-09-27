'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import ErrorState from '@/components/ErrorState'
import { useBoardMutations, useBoards } from '@/hooks/useBoards'
import AppShell from '@/components/layout/AppShell'
import BoardSidebar from '@/components/layout/BoardSidebar'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Skeleton from '@/components/ui/Skeleton'
import { ColumnIcon, PlusIcon, TrashIcon } from '@/components/ui/icons'

export default function BoardsList() {
  const { boards, isPending, error, refetch } = useBoards()
  const { createBoardAsync, isCreatingBoard, deleteBoard } = useBoardMutations()

  // Client state: عنوان بورد در حال تایپ + بوردی که برای حذف تأیید شده
  const [newTitle, setNewTitle] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  /**
   * guard دابل‌کلیک. `isCreatingBoard` به‌تنهایی کافی نیست: چون فقط بعد از
   * re-render به‌روز می‌شود، دو submit هم‌زمان در یک tick هر دو `false`
   * می‌دیدند و دو بورد با یک عنوان ساخته می‌شد.
   */
  const creatingRef = useRef(false)

  /**
   * ساخت بورد و پاک‌کردن ورودی *فقط* پس از موفقیت واقعی.
   *
   * قبلاً ورودی بلافاصله بعد از فراخوانی پاک می‌شد؛ در خطای شبکه یا RLS
   * کاربر عنوانش را از دست می‌داد و باید دوباره تایپ می‌کرد.
   */
  const submitCreate = useCallback(
    async (rawTitle?: string) => {
      const title = (rawTitle ?? newTitle).trim()
      if (!title || creatingRef.current) return

      creatingRef.current = true
      setCreateError(null)
      try {
        await createBoardAsync(title)
        // فقط حالا که واقعاً روی سرور هست
        setNewTitle('')
      } catch {
        // ورودی دست‌نخورده می‌ماند تا کاربر بتواند دوباره تلاش کند
        setCreateError('ساخت بورد انجام نشد. دوباره تلاش کنید.')
      } finally {
        creatingRef.current = false
      }
    },
    [createBoardAsync, newTitle]
  )

  function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    void submitCreate()
  }

  return (
    <AppShell
      sidebar={BoardSidebar}
      headerMeta={<span className="text-[13px] text-text-2">بوردهای من</span>}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-text">
                بوردهای من
              </h1>
              <p className="mt-1 text-[13px] text-text-2">
                {isPending
                  ? 'در حال بارگذاری…'
                  : `${boards.length.toLocaleString('fa-IR')} بورد`}
              </p>
            </div>

            <form onSubmit={handleCreate} className="flex w-full max-w-sm flex-col gap-1.5">
              <div className="flex gap-2">
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
                        setNewTitle(event.target.value)
                        if (createError) setCreateError(null)
                      }}
                      placeholder="مثلاً: برنامه‌ی فصل"
                    />
                  )}
                </Field>
                <Button
                  type="submit"
                  className="self-end"
                  loading={isCreatingBoard}
                  disabled={isCreatingBoard}
                >
                  <PlusIcon size={16} />
                  {isCreatingBoard ? 'در حال ساخت…' : 'ساخت بورد'}
                </Button>
              </div>
            </form>
          </div>

          <div className="mt-8">
            {isPending ? (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <li key={index}>
                    <Skeleton className="h-24 w-full rounded-xl" />
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
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {boards.map((board) => (
                  <li key={board.id}>
                    <div className="group relative flex h-24 flex-col justify-between rounded-xl border border-border bg-surface p-4 shadow-xs transition-colors duration-150 hover:border-border-2 hover:shadow-sm">
                      <Link
                        href={`/board/${board.id}`}
                        className="min-w-0 rounded outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <h2 className="truncate text-sm font-medium text-text group-hover:text-primary">
                          {board.title}
                        </h2>
                        <p className="mt-1 text-xs text-text-muted">
                          ساخته‌شده{' '}
                          {new Date(board.created_at).toLocaleDateString('fa-IR')}
                        </p>
                      </Link>

                      {/* حذف در حالت hover نمایان می‌شود تا شبکه شلوغ نشود،
                          اما در صفحه‌کلید همیشه در دسترس است (focus-within) */}
                      <button
                        type="button"
                        onClick={() => setPendingDelete(board.id)}
                        aria-label={`حذف بورد ${board.title}`}
                        className="absolute bottom-3 end-3 flex h-7 w-7 items-center justify-center rounded-md text-text-muted opacity-0 transition-all duration-150 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="حذف بورد"
          description={`بورد «${boards.find((board) => board.id === pendingDelete)?.title ?? ''}» و همه‌ی ستون‌ها و کارت‌های آن برای همیشه حذف می‌شود. این عمل قابل بازگشت نیست.`}
          confirmLabel="حذف بورد"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteBoard(pendingDelete)
            setPendingDelete(null)
          }}
        />
      )}
    </AppShell>
  )
}
