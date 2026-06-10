import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, computeAdminToken } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { error: "管理者パスワードが設定されていません。" },
      { status: 500 }
    );
  }

  if (body.password !== adminPassword) {
    return NextResponse.json(
      { error: "パスワードが正しくありません。" },
      { status: 401 }
    );
  }

  const token = await computeAdminToken(adminPassword);
  const res = NextResponse.json({ success: true });

  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8時間
  });

  return res;
}
