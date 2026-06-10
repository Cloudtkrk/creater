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
