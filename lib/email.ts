import { Resend } from "resend";
import { formatDate } from "./date";

interface ApprovalMailParams {
  creatorName: string;
  creatorEmail: string;
  brand: string;
  startDate: string;
  endDate: string;
}

// 承認時の通知メールを送信する
export async function sendApprovalEmail(params: ApprovalMailParams) {
  const { creatorName, creatorEmail, brand, startDate, endDate } = params;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY が未設定のためメール送信をスキップします。");
    return;
  }

  const resend = new Resend(apiKey);
  // 検証済みドメインの送信元。RESEND_FROM で上書き可能。
  const from =
    process.env.RESEND_FROM ??
    "NewTrend タイムセール設定連絡 <noreply@mail.entercommerce.co.jp>";

  const body = `${creatorName} さん

以下のタイムセール申請が承認されました。

■ ブランド：${brand}
■ 期間：${formatDate(startDate)} 〜 ${formatDate(endDate)}

ご不明点はご担当者までお問い合わせください。`;

  await resend.emails.send({
    from,
    to: creatorEmail,
    subject: `【タイムセール承認のお知らせ】${brand}`,
    text: body,
  });
}
