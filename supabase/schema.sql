-- タイムセール管理アプリ DBスキーマ（LINEログイン版）
-- Supabase の SQL Editor で実行してください。
-- 新規プロジェクト・既存DBのどちらでも安全に実行できます。

create table if not exists applications (
  id uuid default gen_random_uuid() primary key,
  submission_id uuid not null,
  line_user_id text,
  creator_name text not null,
  brand text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 既存（メール版）の applications テーブルから移行する場合の調整。
-- LINE版では line_user_id を使い、メール認証関連の列があれば制約を外す。
alter table applications add column if not exists line_user_id text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'applications' and column_name = 'creator_email'
  ) then
    alter table applications alter column creator_email drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_name = 'applications' and column_name = 'creator_id'
  ) then
    alter table applications alter column creator_id drop not null;
  end if;
end $$;

alter table applications enable row level security;

-- クリエイターは Supabase Auth を使わず、書き込み・参照はすべて
-- 管理者API（service_role キー）経由で行うため、RLS はポリシー無しで
-- 有効化しておく（anon からの直接アクセスを拒否する）。service_role は
-- RLS をバイパスする。
-- ※ 既存のメール版ポリシーが残っていても害はないが、不要なら削除してよい。
drop policy if exists "creator_select" on applications;
drop policy if exists "creator_insert" on applications;


-- ============================================================
-- ブランドマスタ（管理画面から追加・削除する）
-- ============================================================
create table if not exists brands (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now()
);

alter table brands enable row level security;

-- 再実行しても安全なように、既存ポリシーがあれば一度削除する
drop policy if exists "brands_public_select" on brands;
drop policy if exists "brands_service_insert" on brands;
drop policy if exists "brands_service_update" on brands;
drop policy if exists "brands_service_delete" on brands;

-- 閲覧：全ユーザー（匿名・クリエイター含む）が参照できる
create policy "brands_public_select" on brands
  for select using (true);

-- 追加・更新・削除：管理者API（service_role キー）のみ許可する。
-- service_role は本来 RLS をバイパスするが、意図を明示するために
-- 明示的なポリシーも用意しておく（anon / authenticated には書き込み権限を与えない）。
create policy "brands_service_insert" on brands
  for insert to service_role with check (true);

create policy "brands_service_update" on brands
  for update to service_role using (true) with check (true);

create policy "brands_service_delete" on brands
  for delete to service_role using (true);

-- 初期ブランド（既存の5ブランド）を投入
insert into brands (name) values
  ('Cosme Tokyo'),
  ('Style Lab'),
  ('FreshFit'),
  ('HomeBliss'),
  ('GlowUp Japan')
on conflict (name) do nothing;
