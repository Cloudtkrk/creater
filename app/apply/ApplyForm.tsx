"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_BRANDS,
  MAX_SCHEDULES_PER_BRAND,
  MAX_DAYS_PER_SCHEDULE,
} from "@/lib/brands";
import {
  addDaysStr,
  diffDaysInclusive,
  formatDate,
  getMinApplyDate,
} from "@/lib/date";
import type { ApplyEntryForm, ApplyEntry } from "@/types";

interface Props {
  creatorName: string;
  brands: string[];
}

function emptySchedule() {
  return { startDate: "", endDate: "" };
}

function emptyEntry(): ApplyEntryForm {
  return { brand: "", schedules: [emptySchedule()] };
}

export default function ApplyForm({ creatorName, brands }: Props) {
  const router = useRouter();

  const [entries, setEntries] = useState<ApplyEntryForm[]>([emptyEntry()]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 選択できる最短日（当日不可・17時以降は翌日も不可）。
  const minDate = useMemo(() => getMinApplyDate(), []);
  // 同時に申請できるブランド数の上限（登録ブランド数を超えない）
  const maxBrandRows = Math.min(MAX_BRANDS, brands.length);

  function updateBrand(index: number, brand: string) {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, brand } : e))
    );
  }

  function updateSchedule(
    entryIndex: number,
    schedIndex: number,
    field: "startDate" | "endDate",
    value: string
  ) {
    // ネイティブの日付ピッカーは min/max 属性を無視する環境があるため、
    // 選択値を JS 側で強制的に補正（クランプ）して上限・下限を担保する。
    let notice: string | null = null;

    setEntries((prev) =>
      prev.map((e, i) => {
        if (i !== entryIndex) return e;
        const schedules = e.schedules.map((s, si) => {
          if (si !== schedIndex) return s;
          const next = { ...s, [field]: value };

          if (field === "startDate") {
            // 開始日は最短日（当日不可・17時以降は翌日も不可）以降に補正
            if (value && value < minDate) {
              next.startDate = minDate;
              notice = `開始日は ${formatDate(minDate)} 以降です。調整しました。`;
            }
            // 開始日変更で終了日が範囲外になったらクリア
            if (next.endDate && next.startDate) {
              const maxEnd = addDaysStr(
                next.startDate,
                MAX_DAYS_PER_SCHEDULE - 1
              );
              if (next.endDate < next.startDate || next.endDate > maxEnd) {
                next.endDate = "";
              }
            }
          } else {
            // 終了日は「開始日 〜 開始日+(最大3日)」の範囲にクランプ
            if (next.startDate && value) {
              const maxEnd = addDaysStr(
                next.startDate,
                MAX_DAYS_PER_SCHEDULE - 1
              );
              if (value > maxEnd) {
                next.endDate = maxEnd;
                notice = `1回の日程は最大${MAX_DAYS_PER_SCHEDULE}日間です。終了日を ${formatDate(
                  maxEnd
                )} に調整しました。`;
              } else if (value < next.startDate) {
                next.endDate = next.startDate;
                notice = "終了日は開始日以降です。調整しました。";
              }
            }
          }

          return next;
        });
        return { ...e, schedules };
      })
    );

    setError(notice);
  }

  function addBrand() {
    if (entries.length >= maxBrandRows) return;
    setEntries((prev) => [...prev, emptyEntry()]);
  }

  function removeBrand(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function addSchedule(entryIndex: number) {
    setEntries((prev) =>
      prev.map((e, i) => {
        if (i !== entryIndex) return e;
        if (e.schedules.length >= MAX_SCHEDULES_PER_BRAND) return e;
        return { ...e, schedules: [...e.schedules, emptySchedule()] };
      })
    );
  }

  function removeSchedule(entryIndex: number, schedIndex: number) {
    setEntries((prev) =>
      prev.map((e, i) => {
        if (i !== entryIndex) return e;
        return {
          ...e,
          schedules: e.schedules.filter((_, si) => si !== schedIndex),
        };
      })
    );
  }

  /** バリデーションして送信用の配列を返す。エラー時は文字列を投げる */
  function validate(): ApplyEntry[] {
    const seenBrands = new Set<string>();
    const result: ApplyEntry[] = [];

    for (const entry of entries) {
      if (!entry.brand) {
        throw new Error("ブランドが選択されていない項目があります。");
      }
      if (seenBrands.has(entry.brand)) {
        throw new Error(`ブランド「${entry.brand}」が重複しています。`);
      }
      seenBrands.add(entry.brand);

      if (entry.schedules.length === 0) {
        throw new Error(
          `ブランド「${entry.brand}」の日程を入力してください。`
        );
      }

      for (const s of entry.schedules) {
        if (!s.startDate || !s.endDate) {
          throw new Error(
            `ブランド「${entry.brand}」の日程に未入力があります。`
          );
        }
        if (s.startDate < minDate) {
          throw new Error(
            `ブランド「${entry.brand}」: ${formatDate(minDate)} 以降の日付を選択してください。`
          );
        }
        if (s.endDate < s.startDate) {
          throw new Error(
            `ブランド「${entry.brand}」: 終了日は開始日以降にしてください。`
          );
        }
        const days = diffDaysInclusive(s.startDate, s.endDate);
        if (days > MAX_DAYS_PER_SCHEDULE) {
          throw new Error(
            `ブランド「${entry.brand}」: 1回の日程は${MAX_DAYS_PER_SCHEDULE}日以内にしてください。`
          );
        }
        result.push({
          brand: entry.brand,
          startDate: s.startDate,
          endDate: s.endDate,
        });
      }
    }

    if (result.length === 0) {
      throw new Error("申請内容を入力してください。");
    }

    return result;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let payload: ApplyEntry[];
    try {
      payload = validate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "入力内容を確認してください。");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: payload }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "申請の送信に失敗しました。");
      }

      router.push("/apply/complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "申請の送信に失敗しました。");
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    try {
      const liff = (await import("@line/liff")).default;
      if (liff.isLoggedIn()) liff.logout();
    } catch {
      // LIFF外（通常ブラウザ）で開いている場合は無視
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-gray-400">LINEログイン中</p>
            <p className="text-sm font-semibold text-gray-900">{creatorName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="self-start rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-100 sm:self-auto"
          >
            ログアウト
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-1 text-xl font-bold text-gray-900">
          タイムセール申請
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          最大{maxBrandRows || MAX_BRANDS}ブランド・各ブランド最大
          {MAX_SCHEDULES_PER_BRAND}回の日程（各{MAX_DAYS_PER_SCHEDULE}日間まで）を
          申請できます。開始日は{formatDate(minDate)}以降で選択してください。
        </p>

        {brands.length === 0 && (
          <p className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            現在申請できるブランドが登録されていません。管理者にお問い合わせください。
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {entries.map((entry, i) => {
            // すでに他の項目で選択されているブランドは選択肢から除外
            const usedByOthers = entries
              .filter((_, idx) => idx !== i)
              .map((e) => e.brand)
              .filter(Boolean);

            return (
              <div
                key={i}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700">
                    ブランド {i + 1}
                  </h2>
                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBrand(i)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      削除
                    </button>
                  )}
                </div>

                <select
                  value={entry.brand}
                  onChange={(e) => updateBrand(i, e.target.value)}
                  className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                >
                  <option value="">ブランドを選択</option>
                  {brands.map((b) => (
                    <option
                      key={b}
                      value={b}
                      disabled={usedByOthers.includes(b)}
                    >
                      {b}
                      {usedByOthers.includes(b) ? "（選択済み）" : ""}
                    </option>
                  ))}
                </select>

                <div className="space-y-3">
                  {entry.schedules.map((s, si) => (
                    <div
                      key={si}
                      className="rounded-lg bg-gray-50 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">
                          日程 {si + 1}
                        </span>
                        {entry.schedules.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSchedule(i, si)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            削除
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="date"
                          value={s.startDate}
                          min={minDate}
                          onChange={(e) =>
                            updateSchedule(i, si, "startDate", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                        />
                        <span className="text-center text-gray-400">〜</span>
                        <input
                          type="date"
                          value={s.endDate}
                          // 開始日以降〜最大3日間（開始日+2日）までに制限
                          min={s.startDate || minDate}
                          max={
                            s.startDate
                              ? addDaysStr(s.startDate, MAX_DAYS_PER_SCHEDULE - 1)
                              : undefined
                          }
                          disabled={!s.startDate}
                          onChange={(e) =>
                            updateSchedule(i, si, "endDate", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {entry.schedules.length < MAX_SCHEDULES_PER_BRAND && (
                  <button
                    type="button"
                    onClick={() => addSchedule(i)}
                    className="mt-3 text-sm font-medium text-pink-600 hover:underline"
                  >
                    + 日程を追加
                  </button>
                )}
              </div>
            );
          })}

          {entries.length < maxBrandRows && (
            <button
              type="button"
              onClick={addBrand}
              className="w-full rounded-xl border border-dashed border-gray-300 bg-white py-3 text-sm font-medium text-gray-600 transition hover:border-pink-400 hover:text-pink-600"
            >
              + ブランドを追加
            </button>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-pink-600 py-3 font-medium text-white transition hover:bg-pink-700 disabled:opacity-60"
          >
            {loading ? "送信中..." : "申請する"}
          </button>
        </form>
      </div>
    </main>
  );
}
