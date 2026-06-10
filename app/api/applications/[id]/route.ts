import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendApprovalEmail } from "@/lib/email";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/adminAuth";
import type { Application, UpdateApplicationBody } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 管理者認証:
  //  1) Authorization ヘッダーに ADMIN_PASSWORD を含める（API直接利用向け）
  //  2) 管理者セッション cookie（ダッシュボードからの呼び出し向け）
  const adminPassword = process.env.ADMIN_PASSWORD;
  const auth = req.headers.get("authorization") ?? "";
  const headerToken = auth.replace(/^Bearer\s+/i, "").trim();
  const headerOk = !!adminPassword && headerToken === adminPassword;

  const cookieToken = cookies().get(ADMIN_COOKIE)?.value;
  const cookieOk = await verifyAdminToken(cookieToken);

  if (!headerOk && !cookieOk) {
    return NextResponse.json({ error: "認証に失敗しました。" }, { status: 401 });
  }

  let body: UpdateApplicationBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  if (body.status !== "approved" && body.status !== "rejected") {
    return NextResponse.json(
      { error: "不正なステータスです。" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("applications")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single<Application>();

  if (error || !data) {
    console.error("ステータス更新に失敗:", error);
    return NextResponse.json(
      { error: "更新に失敗しました。" },
      { status: 500 }
    );
  }

  // 承認時はメール送信
  if (body.status === "approved") {
    try {
      await sendApprovalEmail({
        creatorName: data.creator_name,
        creatorEmail: data.creator_email,
        brand: data.brand,
        startDate: data.start_date,
        endDate: data.end_date,
      });
    } catch (e) {
      // メール失敗でもステータス更新は成功とする（ログのみ）
      console.error("メール送信に失敗:", e);
    }
  }

  return NextResponse.json({ success: true });
}
