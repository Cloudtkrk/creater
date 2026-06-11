import { formatDate } from "./date";

interface ApprovalMessageParams {
  creatorName: string;
  brand: string;
  startDate: string;
  endDate: string;
}

// 承認時に LINE で送る通知メッセージ本文を組み立てる
export function buildApprovalMessage(params: ApprovalMessageParams): string {
  const { creatorName, brand, startDate, endDate } = params;
  return `${creatorName} さん

以下のタイムセール申請が承認されました。

■ ブランド：${brand}
■ 期間：${formatDate(startDate)} 〜 ${formatDate(endDate)}

ご不明点はご担当者までお問い合わせください。
NewTrend タイムセール設定連絡`;
}
