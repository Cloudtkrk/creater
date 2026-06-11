import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLinePush } from "@/lib/line";
import { buildApprovalMessage } from "@/lib/notify";
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

  // 承認時は LINE プッシュ通知を送信
  if (body.status === "approved" && data.line_user_id) {
    try {
      await sendLinePush(
        data.line_user_id,
        buildApprovalMessage({
          creatorName: data.creator_name,
          brand: data.brand,
          startDate: data.start_date,
          endDate: data.end_date,
        })
      );
    } catch (e) {
      // 通知失敗でもステータス更新は成功とする（ログのみ）
      console.error("LINE通知の送信に失敗:", e);
    }
  }

  return NextResponse.json({ success: true });
}
