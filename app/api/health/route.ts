import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinApplyDate } from "@/lib/date";

export const dynamic = "force-dynamic";

// デプロイの鮮度・DB接続・ブランド件数・env設定を確認するための診断エンドポイント。
// このルートが 200 で返る = 3機能（日付3日制限/ブランド管理/当日17時ルール）を含む
// 最新ビルドがデプロイされている証拠（古いビルドにはこのルートが存在せず404になる）。
export async function GET() {
  let brandCount: number | null = null;
  let brandError: string | null = null;

  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("brands")
      .select("*", { count: "exact", head: true });
    if (error) brandError = error.message;
    else brandCount = count ?? 0;
  } catch (e) {
    brandError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    version: "line-v2",
    features: [
      "①終了日は開始日+最大3日まで(date min/max)",
      "②ブランドの管理画面CRUD",
      "③当日不可・17時以降は翌日も不可(JST)",
    ],
    minApplyDate: getMinApplyDate(), // ③のロジック結果
    brands: { count: brandCount, error: brandError }, // ②のデータ/スキーマ確認
    env: {
      NEXT_PUBLIC_LIFF_ID: !!process.env.NEXT_PUBLIC_LIFF_ID,
      LINE_LOGIN_CHANNEL_ID: !!process.env.LINE_LOGIN_CHANNEL_ID,
      LINE_CHANNEL_ID: !!process.env.LINE_CHANNEL_ID,
      LINE_CHANNEL_ACCESS_TOKEN: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
  });
}
