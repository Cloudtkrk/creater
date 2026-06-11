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
  const { error } = await supabase.from("brands").delete().eq("id", params.id);

  if (error) {
    console.error("ブランド削除に失敗:", error);
    return NextResponse.json({ error: "削除に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
