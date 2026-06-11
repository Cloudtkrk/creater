# タイムセール管理アプリ（LINEログイン版）

TikTok Shop 向けのタイムセール日程管理アプリです。
クリエイターは **LINEログイン**で申請し、管理者が承認すると **LINEのプッシュ通知**が届きます。
申請フォーム・ダッシュボードは LIFF（LINE内ブラウザ）と通常のWebの両方で動作します。

> メール認証版は別ブランチ（`claude/exciting-knuth-7mnvz3`）にあります。本ブランチは LINE 版です。

## 技術スタック

- **Framework**: Next.js 14（App Router）
- **Database**: Supabase（PostgreSQL）
- **クリエイター認証**: LINE Login（LIFF）
- **通知**: LINE Messaging API（プッシュメッセージ）
- **管理者認証**: パスワード + httpOnly cookie
- **Styling**: Tailwind CSS / **Language**: TypeScript / **Deploy**: Vercel

## 機能

### クリエイター側
- `/` LINEログイン（LIFFで自動ログイン）
- `/apply` タイムセール申請フォーム（要ログイン）
  - 最大 5 ブランド、各ブランド最大 3 回の日程（各 3 日間まで）
  - 当日申請不可。当日 17:00（JST）以降は翌日も不可
- `/apply/complete` 申請完了

### 管理者側
- `/admin` 管理者ログイン（パスワード認証）
- `/admin/dashboard` ダッシュボード（要管理者認証）
  - サマリーカード（総申請数・審査待ち・承認済み）
  - ブランド管理（追加・削除）
  - 月次カレンダー（承認済み=緑 / 審査中=黄）
  - 申請一覧テーブル（ステータス・ブランドフィルター、承認 / 却下）
  - 承認時にクリエイターへ LINE プッシュ通知

## 環境変数

`.env.local.example` をコピーして `.env.local` を作成します。

```
# Supabase（DB）
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LINE
NEXT_PUBLIC_LIFF_ID=            # LIFFアプリのID（クライアントで使用）
LINE_CHANNEL_ID=               # IDトークン検証用のチャネルID（Messaging APIチャネル）
LINE_CHANNEL_ACCESS_TOKEN=     # プッシュ通知用のチャネルアクセストークン

# セッション
SESSION_SECRET=                # クリエイターセッションcookieの署名鍵（ランダム文字列）

# 管理者
ADMIN_PASSWORD=admin123
```

## LINE 側のセットアップ

1. [LINE Developers Console](https://developers.line.biz/console/) で **プロバイダー**を作成
2. **Messaging API チャネル**を作成（= LINE公式アカウント）
   - 「チャネルID」→ `LINE_CHANNEL_ID`
   - 「チャネルアクセストークン（長期）」を発行 → `LINE_CHANNEL_ACCESS_TOKEN`
   - **応答メッセージ**はオフ、**あいさつメッセージ**は任意
3. 同チャネルに **LIFF アプリ**を追加
   - エンドポイントURL：`https://<デプロイ先ドメイン>/`（トップページ）
   - サイズ：`Full`
   - スコープ：`openid` と `profile` を有効化（表示名取得のため）
   - 発行された **LIFF ID** → `NEXT_PUBLIC_LIFF_ID`
4. クリエイターに公式アカウントを**友だち追加**してもらう（プッシュ通知の送信先になるため必須）
   - リッチメニューに LIFF の URL（`https://liff.line.me/<LIFF_ID>`）を貼ると導線になります

> 補足：LIFF を Messaging API チャネルに追加することで、ログインで得られる userId と
> プッシュ通知の宛先 userId が一致します。`SESSION_SECRET` は `openssl rand -hex 32` などで生成してください。

## データベースの初期化

Supabase プロジェクトの SQL Editor で [`supabase/schema.sql`](./supabase/schema.sql) を実行します。
`applications`（`line_user_id` 列を含む）と `brands`（初期5ブランド付き）が作成されます。
新規プロジェクト・既存DBのどちらでも安全に実行できます（`if not exists` / 条件付き ALTER）。

## デプロイ手順（Vercel）

1. このリポジトリを GitHub に push
2. vercel.com で「Add New Project」→ リポジトリをインポート
3. 「Environment Variables」に上記の環境変数をすべて登録
4. 「Deploy」を実行
5. 発行されたドメイン（または独自ドメイン）を **LIFF のエンドポイントURL** に設定
6. 友だち追加 → LIFF を開く → LINEログイン → 申請、の流れで動作確認

### 以降の更新

```bash
git add .
git commit -m "update"
git push
```

push するだけで Vercel が自動で再デプロイします。

## 注意事項

- クリエイター認証は LINE Login（LIFF）。サーバーで ID トークンを検証し、
  改ざん防止のため HMAC 署名付き cookie（`creator_session`）でセッション管理します。
- クリエイターの DB 書き込み・参照はすべて管理者API（service_role キー）経由で行います。
- 管理者認証は `ADMIN_PASSWORD` とのパスワード照合 + httpOnly cookie（`admin_session`）。
- 承認 / 却下 API（`PATCH /api/applications/[id]`）は、`Authorization` ヘッダーに
  `ADMIN_PASSWORD` を含めるか、有効な管理者セッション cookie のいずれかで認証されます。
- LINE プッシュは承認時のみ送信。`LINE_CHANNEL_ACCESS_TOKEN` 未設定時は送信をスキップします。
