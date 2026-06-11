// 日付関連のユーティリティ。表示はすべて YYYY/MM/DD 形式。

/** "2026-06-10" や Date を "2026/06/10" に整形する */
export function formatDate(input: string | Date): string {
  const d = typeof input === "string" ? parseDateOnly(input) : input;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

/** "YYYY-MM-DD" をローカルタイムの Date として解釈する（タイムゾーンずれ防止） */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

/** "YYYY-MM-DD" 形式の文字列を返す */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 開始日と終了日の差（両端含む日数）を返す。
 * 例: 同一日 -> 1日, 翌日 -> 2日
 */
export function diffDaysInclusive(start: string, end: string): number {
  const s = parseDateOnly(start);
  const e = parseDateOnly(end);
  const ms = e.getTime() - s.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

/** その日付（YYYY-MM-DD）が start〜end の期間に含まれるか */
export function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

/** 文字列日付（YYYY-MM-DD）に日数を加算して返す */
export function addDaysStr(dateStr: string, days: number): string {
  const d = parseDateOnly(dateStr);
  d.setDate(d.getDate() + days);
  return toDateInputValue(d);
}

/**
 * 日本時間（Asia/Tokyo）での「現在の日付と時刻」を取得する。
 * サーバー（UTC）でもブラウザ（任意TZ）でも常に JST で計算するため Intl を使用。
 */
export function getJstNowParts(now: Date = new Date()): {
  dateStr: string;
  hour: number;
} {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = parseInt(get("hour"), 10);
  return { dateStr, hour };
}

/**
 * 申請で選択できる最短の日付（YYYY-MM-DD）を返す。
 *  - 当日は常に選択不可（最短でも翌日）
 *  - 当日 17:00（JST）以降は翌日も不可（最短は翌々日）
 */
export function getMinApplyDate(now: Date = new Date()): string {
  const { dateStr, hour } = getJstNowParts(now);
  const offset = hour >= 17 ? 2 : 1;
  return addDaysStr(dateStr, offset);
}

