create table if not exists public.project_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  repo_identifier text not null,
  rule_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.review_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  repo_identifier text not null,
  pr_url text,
  mode text not null check (mode in ('developer', 'reviewer')),
  summary text not null,
  raw_response jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.project_rules enable row level security;
alter table public.review_logs enable row level security;

create policy "Users can view their own project rules"
  on public.project_rules for select
  using (auth.uid() = user_id);

create policy "Users can insert their own project rules"
  on public.project_rules for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own project rules"
  on public.project_rules for delete
  using (auth.uid() = user_id);

create policy "Users can view their own review logs"
  on public.review_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own review logs"
  on public.review_logs for insert
  with check (auth.uid() = user_id);

create index if not exists idx_review_logs_user_id on public.review_logs(user_id);
create index if not exists idx_project_rules_user_id on public.project_rules(user_id);
