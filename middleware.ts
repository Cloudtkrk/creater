import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/adminAuth";
import { CREATOR_COOKIE, verifySessionToken } from "@/lib/lineSession";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 管理者ダッシュボードは admin_session cookie を検証
  if (pathname.startsWith("/admin/dashboard")) {
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    if (!(await verifyAdminToken(token))) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 申請ページは LINEログインのクリエイターセッションを検証
  if (pathname.startsWith("/apply")) {
    const token = request.cookies.get(CREATOR_COOKIE)?.value;
    if (!(await verifySessionToken(token))) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard/:path*", "/apply/:path*"],
};
