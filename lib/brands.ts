// ブランドは Supabase の brands テーブルで管理し、管理画面から追加・削除します。
// 以下は初期データ（supabase/schema.sql のシード）と同じ参考リストです。
export const DEFAULT_BRANDS = [
  "Cosme Tokyo",
  "Style Lab",
  "FreshFit",
  "HomeBliss",
  "GlowUp Japan",
] as const;

// 1回の申請で同時に選べるブランド数の上限
export const MAX_BRANDS = 5;
export const MAX_SCHEDULES_PER_BRAND = 3;
export const MAX_DAYS_PER_SCHEDULE = 3;
