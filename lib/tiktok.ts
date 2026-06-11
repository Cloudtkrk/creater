// TikTok クリエイターID（@以降のハンドル）の正規化・検証。

/** 先頭の @ や前後の空白を除去して正規化する */
export function normalizeTiktokId(input: string): string {
  return input.trim().replace(/^@+/, "").trim();
}

/**
 * TikTok ハンドルとして妥当か検証する。
 * 使用可能文字：英数字・アンダースコア・ピリオド、2〜24文字。
 */
export function isValidTiktokId(id: string): boolean {
  return /^[A-Za-z0-9._]{2,24}$/.test(id);
}
