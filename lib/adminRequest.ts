import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminToken } from "./adminAuth";

// 管理者リクエストかどうかを判定する（サーバー専用）。
//  1) Authorization ヘッダーに ADMIN_PASSWORD を含める（API直接利用向け）
//  2) 管理者セッション cookie（ダッシュボードからの呼び出し向け）
export async function isAdminAuthorized(req: NextRequest): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const auth = req.headers.get("authorization") ?? "";
  const headerToken = auth.replace(/^Bearer\s+/i, "").trim();
  if (adminPassword && headerToken === adminPassword) return true;

  const cookieToken = cookies().get(ADMIN_COOKIE)?.value;
  return verifyAdminToken(cookieToken);
}
