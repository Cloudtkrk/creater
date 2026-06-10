"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BRANDS,
  MAX_BRANDS,
  MAX_SCHEDULES_PER_BRAND,
  MAX_DAYS_PER_SCHEDULE,
} from "@/lib/brands";
import { diffDaysInclusive } from "@/lib/date";
import type { ApplyEntryForm, ApplyEntry } from "@/types";

interface Props {
  creatorName: string;
  creatorEmail: string;
}

function emptySchedule() {
  return { startDate: "", endDate: "" };
}

function emptyEntry(): ApplyEntryForm {
  return { brand: "", schedules: [emptySchedule()] };
}

export default function ApplyForm({ creatorName, creatorEmail }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [entries, setEntries] = useState<ApplyEntryForm[]>([emptyEntry()]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    setEntries((prev) =>
      prev.map((e, i) => {
        if (i !== entryIndex) return e;
        const schedules = e.schedules.map((s, si) =>
          si === schedIndex ? { ...s, [field]: value } : s
        );
        return { ...e, schedules };
      })
    );
  }

  function addBrand() {
    if (entries.length >= MAX_BRANDS) return;
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
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">{creatorName}</p>
            <p className="text-xs text-gray-500">{creatorEmail}</p>
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
          最大{MAX_BRANDS}ブランド・各ブランド最大{MAX_SCHEDULES_PER_BRAND}回の日程（各
          {MAX_DAYS_PER_SCHEDULE}日間まで）を申請できます。
        </p>

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
                  {BRANDS.map((b) => (
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
                          onChange={(e) =>
                            updateSchedule(i, si, "startDate", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                        />
                        <span className="text-center text-gray-400">〜</span>
                        <input
                          type="date"
                          value={s.endDate}
                          onChange={(e) =>
                            updateSchedule(i, si, "endDate", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
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

          {entries.length < MAX_BRANDS && (
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
