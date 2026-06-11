import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendApprovalEmail } from "@/lib/email";
import { isAdminAuthorized } from "@/lib/adminRequest";
import type { Application, UpdateApplicationBody } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminAuthorized(req))) {
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
