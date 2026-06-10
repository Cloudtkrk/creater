import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { BRANDS, MAX_DAYS_PER_SCHEDULE } from "@/lib/brands";
import { diffDaysInclusive } from "@/lib/date";
import type { ApplyEntry } from "@/types";

export async function POST(req: NextRequest) {
  const supabase = createClient();

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未認証です。" }, { status: 401 });
  }

  let body: { entries?: ApplyEntry[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const entries = body.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json(
      { error: "申請内容が空です。" },
      { status: 400 }
    );
  }

  // サーバー側でもバリデーション
  for (const entry of entries) {
    if (!entry.brand || !BRANDS.includes(entry.brand as (typeof BRANDS)[number])) {
      return NextResponse.json(
        { error: "不正なブランドが含まれています。" },
        { status: 400 }
      );
    }
    if (!entry.startDate || !entry.endDate) {
      return NextResponse.json(
        { error: "日程が入力されていません。" },
        { status: 400 }
      );
    }
    if (entry.endDate < entry.startDate) {
      return NextResponse.json(
        { error: "終了日は開始日以降にしてください。" },
        { status: 400 }
      );
    }
    if (diffDaysInclusive(entry.startDate, entry.endDate) > MAX_DAYS_PER_SCHEDULE) {
      return NextResponse.json(
        { error: `1回の日程は${MAX_DAYS_PER_SCHEDULE}日以内にしてください。` },
        { status: 400 }
      );
    }
  }

  const creatorName =
    (user.user_metadata?.name as string | undefined) ?? user.email ?? "クリエイター";
  const creatorEmail = user.email ?? "";
  const submissionId = randomUUID();

  const rows = entries.map((entry) => ({
    submission_id: submissionId,
    creator_id: user.id,
    creator_name: creatorName,
    creator_email: creatorEmail,
    brand: entry.brand,
    start_date: entry.startDate,
    end_date: entry.endDate,
    status: "pending",
  }));

  const { error } = await supabase.from("applications").insert(rows);

  if (error) {
    console.error("申請の保存に失敗:", error);
    return NextResponse.json(
      { error: "申請の保存に失敗しました。" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
