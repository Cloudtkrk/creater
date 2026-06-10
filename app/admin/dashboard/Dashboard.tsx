"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BRANDS } from "@/lib/brands";
import {
  formatDate,
  toDateInputValue,
  isDateInRange,
} from "@/lib/date";
import type { Application, ApplicationStatus } from "@/types";

interface Props {
  initialApplications: Application[];
}

type StatusFilter = "all" | ApplicationStatus;
type BrandFilter = "all" | string;

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: "審査待ち",
  approved: "承認済み",
  rejected: "却下",
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function Dashboard({ initialApplications }: Props) {
  const router = useRouter();
  const [applications, setApplications] =
    useState<Application[]>(initialApplications);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-indexed

  // サマリー
  const summary = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => a.status === "pending").length;
    const approved = applications.filter((a) => a.status === "approved").length;
    return { total, pending, approved };
  }, [applications]);

  // テーブル用のフィルタ済み + ソート済みリスト
  const filtered = useMemo(() => {
    let list = applications.slice();

    if (statusFilter !== "all") {
      list = list.filter((a) => a.status === statusFilter);
    }
    if (brandFilter !== "all") {
      list = list.filter((a) => a.brand === brandFilter);
    }

    if (brandFilter === "all") {
      // ブランド名 → 日付順
      list.sort((a, b) => {
        if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
        return a.start_date.localeCompare(b.start_date);
      });
    } else {
      // ブランド固定時は日付順
      list.sort((a, b) => a.start_date.localeCompare(b.start_date));
    }

    return list;
  }, [applications, statusFilter, brandFilter]);

  // カレンダーのセル
  const calendarCells = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    const cells: ({ day: number; dateStr: string } | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateInputValue(new Date(calYear, calMonth, d));
      cells.push({ day: d, dateStr });
    }
    return cells;
  }, [calYear, calMonth]);

  function appsForDate(dateStr: string) {
    return applications
      .filter(
        (a) =>
          a.status !== "rejected" &&
          isDateInRange(dateStr, a.start_date, a.end_date)
      )
      .sort((a, b) => a.brand.localeCompare(b.brand));
  }

  function prevMonth() {
    if (calMonth === 0) {
      setCalYear((y) => y - 1);
      setCalMonth(11);
    } else {
      setCalMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalYear((y) => y + 1);
      setCalMonth(0);
    } else {
      setCalMonth((m) => m + 1);
    }
  }

  async function updateStatus(
    id: string,
    status: "approved" | "rejected"
  ) {
    setUpdatingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "更新に失敗しました。");
      }
      // ローカル状態を更新
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "更新に失敗しました。"
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-16">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-bold text-gray-900">
            管理者ダッシュボード
          </h1>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-100"
          >
            ログアウト
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
        {/* サマリーカード */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="総申請数"
            value={summary.total}
            color="text-gray-900"
          />
          <SummaryCard
            label="審査待ち"
            value={summary.pending}
            color="text-yellow-600"
          />
          <SummaryCard
            label="承認済み"
            value={summary.approved}
            color="text-green-600"
          />
        </section>

        {/* カレンダー */}
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">
              {calYear}年{calMonth + 1}月
            </h2>
            <div className="flex gap-2">
              <button
                onClick={prevMonth}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-100"
              >
                ← 前月
              </button>
              <button
                onClick={nextMonth}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-100"
              >
                翌月 →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, i) => {
              if (!cell) return <div key={`empty-${i}`} className="min-h-20" />;
              const dayApps = appsForDate(cell.dateStr);
              return (
                <div
                  key={cell.dateStr}
                  className="min-h-20 rounded-lg border border-gray-100 bg-gray-50 p-1"
                >
                  <div className="mb-1 text-right text-xs text-gray-400">
                    {cell.day}
                  </div>
                  <div className="space-y-0.5">
                    {dayApps.map((a) => (
                      <div
                        key={a.id}
                        title={`${a.creator_name} / ${a.brand}`}
                        className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight ${
                          a.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {a.creator_name}・{a.brand}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-green-100" />
              承認済み
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-yellow-100" />
              審査中
            </span>
          </div>
        </section>

        {/* 申請一覧テーブル */}
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 text-base font-bold text-gray-900">申請一覧</h2>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                ステータス
              </label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-800 focus:outline-none"
              >
                <option value="all">すべて</option>
                <option value="pending">審査待ち</option>
                <option value="approved">承認済み</option>
                <option value="rejected">却下</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                ブランド
              </label>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-800 focus:outline-none"
              >
                <option value="all">すべて</option>
                {BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {actionError && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {actionError}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="px-2 py-2">クリエイター</th>
                  <th className="px-2 py-2">ブランド</th>
                  <th className="px-2 py-2">期間</th>
                  <th className="px-2 py-2">ステータス</th>
                  <th className="px-2 py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-8 text-center text-gray-400"
                    >
                      該当する申請はありません。
                    </td>
                  </tr>
                )}
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-2 py-3">
                      <div className="font-medium text-gray-900">
                        {a.creator_name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {a.creator_email}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-gray-700">{a.brand}</td>
                    <td className="px-2 py-3 text-gray-700">
                      {formatDate(a.start_date)} 〜 {formatDate(a.end_date)}
                    </td>
                    <td className="px-2 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-2 py-3 text-right">
                      {a.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => updateStatus(a.id, "approved")}
                            disabled={updatingId === a.id}
                            className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-60"
                          >
                            承認
                          </button>
                          <button
                            onClick={() => updateStatus(a.id, "rejected")}
                            disabled={updatingId === a.id}
                            className="rounded-lg bg-red-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-60"
                          >
                            却下
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const styles: Record<ApplicationStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-gray-200 text-gray-600",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
