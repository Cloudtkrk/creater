// LINE Messaging API / LINE Login 連携のサーバー側ユーティリティ。

interface VerifiedProfile {
  userId: string;
  name: string;
}

type VerifyResult =
  | { ok: true; profile: VerifiedProfile }
  | { ok: false; detail: string };

/** JWT のペイロードから aud（宛先チャネルID）を取り出す（検証はしない・デバッグ用） */
function decodeAud(idToken: string): string {
  try {
    const part = idToken.split(".")[1];
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const payload = JSON.parse(json) as { aud?: string | string[] };
    return Array.isArray(payload.aud)
      ? payload.aud.join(",")
      : payload.aud ?? "(なし)";
  } catch {
    return "(解析不可)";
  }
}

/**
 * LIFF から受け取った ID トークンを LINE の verify エンドポイントで検証し、
 * userId（sub）と表示名を取り出す。
 * 署名検証は LINE 側で行われるため、クライアントの自己申告を信用しない。
 *
 * 検証用の client_id は、ID トークンの aud（= LIFF が属するチャネルのID）と
 * 一致する必要がある。LIFF が LINE ログインチャネル配下にある場合は
 * Messaging API チャネルのIDとは異なるため、LINE_LOGIN_CHANNEL_ID を優先する。
 */
export async function verifyLineIdToken(idToken: string): Promise<VerifyResult> {
  const channelId =
    process.env.LINE_LOGIN_CHANNEL_ID || process.env.LINE_CHANNEL_ID;
  if (!channelId) {
    return {
      ok: false,
      detail: "LINE_CHANNEL_ID（または LINE_LOGIN_CHANNEL_ID）が未設定です。",
    };
  }

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: channelId,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    sub?: string;
    name?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok) {
    const reason =
      data.error_description || data.error || `HTTP ${res.status}`;
    const aud = decodeAud(idToken);
    const detail = `IDトークン検証に失敗: ${reason} / トークンのaud=${aud} / 設定したclient_id=${channelId}`;
    console.error(detail);
    return { ok: false, detail };
  }

  if (!data.sub) {
    return { ok: false, detail: "userId(sub)を取得できませんでした。" };
  }

  return {
    ok: true,
    profile: { userId: data.sub, name: data.name?.trim() || "クリエイター" },
  };
}

/**
 * 指定ユーザーに LINE プッシュメッセージ（テキスト）を送信する。
 */
export async function sendLinePush(
  userId: string,
  text: string
): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.warn(
      "LINE_CHANNEL_ACCESS_TOKEN が未設定のためプッシュ送信をスキップします。"
    );
    return;
  }

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text }],
    }),
  });

  if (!res.ok) {
    throw new Error(`LINEプッシュ送信に失敗しました: ${await res.text()}`);
  }
}
