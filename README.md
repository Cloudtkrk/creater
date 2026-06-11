# タイムセール管理アプリ

TikTok Shop 向けのタイムセール日程管理 Web アプリです。
クリエイターが日程を申請し、管理者が承認すると自動でメール通知が送られます。

## 技術スタック

- **Framework**: Next.js 14（App Router）
- **Database / Auth**: Supabase（@supabase/supabase-js, @supabase/ssr）
- **Email**: Resend
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Deploy**: Vercel

## 機能

### クリエイター側
- `/` ログイン
- `/signup` 新規登録（名前・メール・パスワード）
- `/apply` タイムセール申請フォーム（要ログイン）
  - 最大 5 ブランド、各ブランド最大 3 回の日程（各 3 日間まで）
- `/apply/complete` 申請完了

### 管理者側
- `/admin` 管理者ログイン（パスワード認証）
- `/admin/dashboard` ダッシュボード（要管理者認証）
  - サマリーカード（総申請数・審査待ち・承認済み）
  - 月次カレンダー（承認済み=緑 / 審査中=黄）
  - 申請一覧テーブル（ステータス・ブランドフィルター、承認 / 却下）

## ローカル開発

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成し、値を設定します。

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
ADMIN_PASSWORD=admin123
```

> 任意で `RESEND_FROM`（送信元アドレス）も設定できます。未設定時は `onboarding@resend.dev` を使用します。

### 3. データベースの初期化

Supabase プロジェクトの SQL Editor で [`supabase/schema.sql`](./supabase/schema.sql) を実行します。
`applications` テーブルに加えて、ブランドを管理する `brands` テーブル（初期5ブランドのシード付き）が作成されます。

> **既にデプロイ済みで `brands` テーブルが無い場合**は、`supabase/schema.sql` の
> 「ブランドマスタ」以降の SQL（`create table ... brands` 〜 `insert into brands ...`）だけを
> SQL Editor で再実行してください。`if not exists` / `on conflict do nothing` で安全に追加できます。

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 で起動します。

## デプロイ手順（Vercel）

### 前提
- GitHub アカウント
- Vercel アカウント（vercel.com）
- Supabase プロジェクト作成済み
- Resend アカウント・API キー取得済み

### 手順
1. このリポジトリを GitHub に push する
2. vercel.com にログインし「Add New Project」からリポジトリをインポート
3. Vercel の「Environment Variables」に以下を登録する：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `ADMIN_PASSWORD`
4. 「Deploy」を実行 → 自動でビルド・公開される
5. Vercel の「Domains」に独自ドメインを追加し、DNS 設定（CNAME または A レコード）を行う
6. Supabase の Authentication → URL Configuration に以下を設定する：
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: `https://yourdomain.com/apply`

### 以降の更新方法

```bash
git add .
git commit -m "update"
git push
```

push するだけで Vercel が自動で再デプロイします。

## 注意事項

- 管理者認証は Supabase Auth を使わず、`ADMIN_PASSWORD` とのシンプルなパスワード照合です。
  ログイン成功時に httpOnly cookie（`admin_session`）をセットし、middleware で検証します。
- 承認 / 却下 API（`PATCH /api/applications/[id]`）は、`Authorization` ヘッダーに
  `ADMIN_PASSWORD` を含めるか、有効な管理者セッション cookie のいずれかで認証されます。
- メール送信は承認時のみ行われます。`RESEND_API_KEY` 未設定時は送信をスキップします。
