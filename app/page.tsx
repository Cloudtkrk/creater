"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Phase = "init" | "authenticating" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("init");
  const [message, setMessage] = useState("LINEに接続しています...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        setPhase("error");
        setMessage("LIFF IDが設定されていません。管理者にお問い合わせください。");
        return;
      }

      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          // LINEログイン画面へ（戻ってくると isLoggedIn = true）
          liff.login({ redirectUri: window.location.href });
          return;
        }

        if (cancelled) return;
        setPhase("authenticating");
        setMessage("ログイン処理中...");

        const idToken = liff.getIDToken();
        if (!idToken) {
          throw new Error("IDトークンを取得できませんでした。");
        }

        const res = await fetch("/api/auth/line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const base = data.error || "ログインに失敗しました。";
          throw new Error(data.detail ? `${base}\n${data.detail}` : base);
        }

        if (cancelled) return;
        router.replace("/apply");
        router.refresh();
      } catch (err) {
        if (cancelled) return;
        console.error("LINEログイン処理でエラー:", err);
        setPhase("error");
        setMessage(
          err instanceof Error ? err.message : "ログインに失敗しました。"
        );
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-bold text-gray-900">
          タイムセール申請
        </h1>

        {phase !== "error" ? (
          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-green-500" />
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        ) : (
          <div className="mt-6">
            <p className="whitespace-pre-line break-words rounded-lg bg-red-50 px-3 py-2 text-left text-sm text-red-600">
              {message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-green-600 px-6 py-2.5 font-medium text-white transition hover:bg-green-700"
            >
              再試行
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
