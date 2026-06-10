// Supabase の環境変数を正規化して取得する。
// よくある設定ミス（URL末尾のスラッシュ、前後の空白、改行）を吸収し、
// "Invalid path specified in request URL" などのエラーを防ぐ。

export function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL が設定されていません。");
  }
  // 前後の空白・引用符を除去し、末尾のスラッシュを削る
  return raw.trim().replace(/['"]/g, "").replace(/\/+$/, "");
}

export function getSupabaseAnonKey(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!raw) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません。");
  }
  return raw.trim().replace(/['"]/g, "");
}

export function getSupabaseServiceRoleKey(): string {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY が設定されていません。");
  }
  return raw.trim().replace(/['"]/g, "");
}
