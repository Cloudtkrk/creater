import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/adminAuth";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 管理者ダッシュボードは admin_session cookie を検証
  if (pathname.startsWith("/admin/dashboard")) {
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    const ok = await verifyAdminToken(token);
    if (!ok) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // それ以外は Supabase セッションを更新する
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: CookieOptions;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // 静的ファイルと画像以外にマッチ
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
