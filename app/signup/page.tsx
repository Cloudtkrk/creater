"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim() === "") {
      setError("名前を入力してください。");
      return;
    }
    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください。");
      return;
    }
    if (password !== confirm) {
      setError("パスワードが一致しません。");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name.trim() },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // メール確認が無効な場合はセッションが発行される
    if (data.session) {
      router.replace("/apply");
      router.refresh();
    } else {
      // メール確認が必要な設定の場合
      setError(null);
      setLoading(false);
      router.replace("/apply");
      router.refresh();
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">新規登録</h1>
        <p className="mb-6 text-sm text-gray-500">
          クリエイターアカウントを作成
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              名前
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              placeholder="山田 太郎"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              メールアドレス
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              パスワード（6文字以上）
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              パスワード（確認）
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-pink-600 py-2.5 font-medium text-white transition hover:bg-pink-700 disabled:opacity-60"
          >
            {loading ? "登録中..." : "登録する"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/" className="font-medium text-pink-600 hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </main>
  );
}
