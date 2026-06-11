-- タイムセール管理アプリ DBスキーマ
-- Supabase の SQL Editor で実行してください。

create table if not exists applications (
  id uuid default gen_random_uuid() primary key,
  submission_id uuid not null,
  creator_id uuid references auth.users on delete cascade,
  creator_name text not null,
  creator_email text not null,
  brand text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table applications enable row level security;

-- クリエイターは自分の申請のみ参照できる
create policy "creator_select" on applications
  for select using (auth.uid() = creator_id);

-- クリエイターは自分の申請のみ作成できる
create policy "creator_insert" on applications
  for insert with check (auth.uid() = creator_id);

-- 管理者側の参照・更新は service role key を使用するため、
-- RLS をバイパスします（追加ポリシーは不要）。


-- ============================================================
-- ブランドマスタ（管理画面から追加・削除する）
-- ============================================================
create table if not exists brands (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now()
);

alter table brands enable row level security;

-- ブランド一覧は全ユーザー（クリエイター含む）が参照できる
create policy "brands_public_select" on brands
  for select using (true);

-- 追加・削除は service role key 経由（管理者API）のみ。
-- RLS をバイパスするため insert/delete ポリシーは作成しない。

-- 初期ブランド（既存の5ブランド）を投入
insert into brands (name) values
  ('Cosme Tokyo'),
  ('Style Lab'),
  ('FreshFit'),
  ('HomeBliss'),
  ('GlowUp Japan')
on conflict (name) do nothing;
