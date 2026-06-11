import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthorized } from "@/lib/adminRequest";

// ブランドを削除（管理者のみ）
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminAuthorized(req))) {
    return NextResponse.json({ error: "認証に失敗しました。" }, { status: 401 });
  }

  const supabase = createAdminClient();
  // 削除した行を返してもらい、実際に削除されたかを検証する。
  // service_role キーが正しくない場合は RLS により 0 行となり、
  // エラーも返らない（沈黙の失敗）ため、ここで検知する。
  const { data, error } = await supabase
    .from("brands")
    .delete()
    .eq("id", params.id)
    .select("id");

  if (error) {
    console.error("ブランド削除に失敗:", error);
    return NextResponse.json({ error: "削除に失敗しました。" }, { status: 500 });
  }

  if (!data || data.length === 0) {
    console.error(
      "ブランド削除が0件でした。対象が存在しないか、SUPABASE_SERVICE_ROLE_KEY が service_role キーでない可能性があります。"
    );
    return NextResponse.json(
      {
        error:
          "削除できませんでした。対象が存在しないか、サーバーの権限設定（SUPABASE_SERVICE_ROLE_KEY）をご確認ください。",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
