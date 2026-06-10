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
