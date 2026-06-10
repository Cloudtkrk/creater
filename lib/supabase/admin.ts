import { createClient } from "@supabase/supabase-js";

// service role key を使った管理者用クライアント（RLS をバイパス）
// 必ずサーバー側でのみ使用すること。
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
