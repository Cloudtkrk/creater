import Link from "next/link";

export default function ApplyCompletePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-bold text-gray-900">
          申請が完了しました
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          審査の結果は登録されたメールアドレスへご連絡します。
        </p>
        <Link
          href="/apply"
          className="inline-block rounded-lg bg-pink-600 px-6 py-2.5 font-medium text-white transition hover:bg-pink-700"
        >
          申請フォームに戻る
        </Link>
      </div>
    </main>
  );
}
