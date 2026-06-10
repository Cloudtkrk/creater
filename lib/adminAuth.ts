// 管理者セッション用のシンプルなトークン生成・検証。
// パスワードを直接 cookie に保存せず、SHA-256 から導出したトークンを使う。
// Web Crypto API は Node ランタイム・Edge ランタイム双方で利用可能。

export const ADMIN_COOKIE = "admin_session";

export async function computeAdminToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`timesale-admin:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// cookie のトークンが現在の ADMIN_PASSWORD に対応しているか検証
export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || !token) return false;
  const expected = await computeAdminToken(adminPassword);
  return token === expected;
}
