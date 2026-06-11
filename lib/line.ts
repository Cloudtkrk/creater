// LINE Messaging API / LINE Login 連携のサーバー側ユーティリティ。

interface VerifiedProfile {
  userId: string;
  name: string;
}

/**
 * LIFF から受け取った ID トークンを LINE の verify エンドポイントで検証し、
 * userId（sub）と表示名を取り出す。
 * 署名検証は LINE 側で行われるため、クライアントの自己申告を信用しない。
 */
export async function verifyLineIdToken(
  idToken: string
): Promise<VerifiedProfile | null> {
  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) {
    console.error("LINE_CHANNEL_ID が未設定です。");
    return null;
  }

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: channelId,
    }),
  });

  if (!res.ok) {
    console.error("LINE IDトークンの検証に失敗:", await res.text());
    return null;
  }

  const payload = (await res.json()) as {
    sub?: string;
    name?: string;
  };

  if (!payload.sub) return null;

  return {
    userId: payload.sub,
    name: payload.name?.trim() || "クリエイター",
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
