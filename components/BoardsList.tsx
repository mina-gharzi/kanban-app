"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getBoards,
  createBoard,
  deleteBoard,
  type Board,
} from "@/lib/supabase/queries";
import { useToastStore } from "@/store/toastStore";
import { signOut } from "@/lib/supabase/auth";
import { useRouter } from "next/navigation";

export default function BoardsList() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");

  const addToast = useToastStore((s) => s.addToast);

  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }
  useEffect(() => {
    loadBoards();
  }, []);

  async function loadBoards() {
    try {
      setIsLoading(true);
      const data = await getBoards();
      setBoards(data);
    } catch (err) {
      console.error("خطا در دریافت بوردها:", err);
      addToast("دریافت لیست بوردها با مشکل مواجه شد.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    try {
      const board = await createBoard(title);
      setBoards((prev) => [board, ...prev]);
      setNewTitle("");
    } catch (err) {
      console.error("خطا در ساخت بورد:", err);
      addToast("ساخت بورد با مشکل مواجه شد.");
    }
  }

  async function handleDelete(boardId: string) {
    setBoards((prev) => prev.filter((b) => b.id !== boardId)); // optimistic
    try {
      await deleteBoard(boardId);
    } catch (err) {
      console.error("خطا در حذف بورد:", err);
      addToast("حذف بورد با مشکل مواجه شد.");
    }
  }

  return (
    <div className="min-h-screen bg-surface p-8">
      <h1 className="text-column text-xl font-bold mb-6">بوردهای من</h1>
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
          className="flex-1 bg-column/10 text-column rounded-md p-2 outline-none border border-column/20 focus:border-accent"
        />
        <button
          type="submit"
          className="bg-accent text-surface px-4 py-2 rounded-md text-sm"
        >
          ساخت بورد
        </button>
      </form>

      {isLoading ? (
        <p className="text-column/60">در حال بارگذاری...</p>
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
                onClick={() => handleDelete(board.id)}
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
