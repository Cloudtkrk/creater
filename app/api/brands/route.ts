import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthorized } from "@/lib/adminRequest";
import type { Brand } from "@/types";

// ブランド一覧を取得（誰でも可）
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("ブランド取得に失敗:", error);
    return NextResponse.json({ error: "取得に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ brands: (data ?? []) as Brand[] });
}

// ブランドを追加（管理者のみ）
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized(req))) {
    return NextResponse.json({ error: "認証に失敗しました。" }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "ブランド名を入力してください。" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("brands")
    .insert({ name })
    .select()
    .single<Brand>();

  if (error) {
    // 一意制約違反（重複）
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "同名のブランドが既に存在します。" },
        { status: 409 }
      );
    }
    // RLS 違反（service_role キーが正しく設定されていない可能性）
    if (error.code === "42501") {
      console.error(
        "ブランド追加が RLS で拒否されました。SUPABASE_SERVICE_ROLE_KEY が service_role キーか確認してください。"
      );
      return NextResponse.json(
        {
          error:
            "追加できませんでした。サーバーの権限設定（SUPABASE_SERVICE_ROLE_KEY）をご確認ください。",
        },
        { status: 500 }
      );
    }
    console.error("ブランド追加に失敗:", error);
    return NextResponse.json({ error: "追加に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ brand: data });
}
