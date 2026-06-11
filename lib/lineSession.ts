// クリエイターのログインセッションを、改ざん防止のため HMAC 署名付き
// cookie で管理する。LINE Login（LIFF）で本人確認したあとに発行する。
// Web Crypto を使うため Node / Edge 双方で動作する。

export const CREATOR_COOKIE = "creator_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7日

export interface CreatorSession {
  uid: string; // LINE userId
  name: string;
  exp: number; // 失効時刻（UNIX秒）
}

function getSecret(): string {
  // 専用シークレット優先。未設定時はチャネルアクセストークンで代用。
  return (
    process.env.SESSION_SECRET ||
    process.env.LINE_CHANNEL_ACCESS_TOKEN ||
    "insecure-dev-secret"
  );
}

function base64url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return base64url(new Uint8Array(sig));
}

/** セッションを署名付きトークン文字列に変換する */
export async function createSessionToken(
  uid: string,
  name: string
): Promise<string> {
  const session: CreatorSession = {
    uid,
    name,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  };
  const payload = base64url(new TextEncoder().encode(JSON.stringify(session)));
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

/** トークンを検証して CreatorSession を返す。不正・失効なら null */
export async function verifySessionToken(
  token: string | undefined
): Promise<CreatorSession | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = await hmac(payload);
  if (sig !== expected) return null;

  try {
    const json = new TextDecoder().decode(base64urlDecode(payload));
    const session = JSON.parse(json) as CreatorSession;
    if (!session.uid || session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export const CREATOR_COOKIE_MAX_AGE = MAX_AGE_SEC;
