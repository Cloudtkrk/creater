import { NextResponse } from "next/server";
import { CREATOR_COOKIE } from "@/lib/lineSession";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(CREATOR_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
