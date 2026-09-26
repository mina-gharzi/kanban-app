"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBoardMutations, useBoards } from "@/hooks/useBoards";
import { signOut } from "@/lib/supabase/auth";

export default function BoardsList() {
  const router = useRouter();
  const { data: boards, isPending, isError } = useBoards();
  const { createBoard, deleteBoard } = useBoardMutations();

  // Client state: فقط عنوان بورد در حال تایپ
  const [newTitle, setNewTitle] = useState("");

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    createBoard(title);
    setNewTitle("");
  }

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-column text-xl font-bold">بوردهای من</h1>
        <button
          onClick={handleSignOut}
          className="text-accent text-sm hover:opacity-70"
        >
          خروج
        </button>
      </div>

      <form onSubmit={handleCreate} className="flex gap-2 mb-8 max-w-md">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="عنوان بورد جدید..."
          aria-label="عنوان بورد جدید"
          className="flex-1 bg-column/10 text-column rounded-md p-2 outline-none border border-column/20 focus:border-accent"
        />
        <button
          type="submit"
          className="bg-accent text-surface px-4 py-2 rounded-md text-sm"
        >
          ساخت بورد
        </button>
      </form>

      {isPending ? (
        <p className="text-column/60">در حال بارگذاری...</p>
      ) : isError ? (
        <p className="text-accent">دریافت لیست بوردها با مشکل مواجه شد.</p>
      ) : boards.length === 0 ? (
        <p className="text-column/60">هنوز بوردی نساختی.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {boards.map((board) => (
            <div
              key={board.id}
              className="bg-column rounded-xl p-4 flex flex-col justify-between"
            >
              <Link href={`/board/${board.id}`}>
                <h3 className="text-surface font-medium mb-1 hover:underline">
                  {board.title}
                </h3>
                <p className="text-surface/50 text-xs">
                  {new Date(board.created_at).toLocaleDateString("fa-IR")}
                </p>
              </Link>
              <button
                onClick={() => deleteBoard(board.id)}
                aria-label={`حذف بورد ${board.title}`}
                className="text-accent text-xs self-end mt-3 hover:opacity-70"
              >
                حذف بورد
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
