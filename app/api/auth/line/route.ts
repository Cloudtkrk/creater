import { NextRequest, NextResponse } from "next/server";
import { verifyLineIdToken } from "@/lib/line";
import {
  CREATOR_COOKIE,
  CREATOR_COOKIE_MAX_AGE,
  createSessionToken,
} from "@/lib/lineSession";

// LIFF から ID トークンを受け取り、検証してクリエイターセッションを発行する
export async function POST(req: NextRequest) {
  let body: { idToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  if (!body.idToken) {
    return NextResponse.json(
      { error: "IDトークンがありません。" },
      { status: 400 }
    );
  }

  const profile = await verifyLineIdToken(body.idToken);
  if (!profile) {
    return NextResponse.json(
      { error: "LINE認証に失敗しました。" },
      { status: 401 }
    );
  }

  const token = await createSessionToken(profile.userId, profile.name);
  const res = NextResponse.json({ success: true, name: profile.name });

  res.cookies.set(CREATOR_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CREATOR_COOKIE_MAX_AGE,
  });

  return res;
}
