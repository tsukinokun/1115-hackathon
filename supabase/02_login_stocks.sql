-- =====================================================================
-- Google ログインとストック（Issue #5）。schema.sql のあとに流す。
-- 何度流しても大丈夫（既にあるものは作り直すだけ）。
-- =====================================================================

-- ---------- 投稿者名に本名を使わない ----------
-- Google でログインすると raw_user_meta_data.name に本名が入る。
-- 投稿者名（by ○○）は公開されるので、アプリが自分で付けた display_name だけを使う。
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'ななしの台所'));
  return new;
end;
$$;

-- ---------- ストック（あとで作りたいレシピ） ----------
create table if not exists public.stocks (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  recipe_id   text not null references public.recipes (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, recipe_id)
);
create index if not exists stocks_user_id_created_at_idx on public.stocks (user_id, created_at desc);

alter table public.stocks enable row level security;

-- 見られるのは自分のストックだけ（他人には見えない）
drop policy if exists "read own stocks" on public.stocks;
create policy "read own stocks" on public.stocks
  for select to authenticated using (user_id = (select auth.uid()));

-- 追加できるのは Google などでログインした本人だけ（匿名ユーザーは不可）
drop policy if exists "add own stocks" on public.stocks;
create policy "add own stocks" on public.stocks
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  );

drop policy if exists "remove own stocks" on public.stocks;
create policy "remove own stocks" on public.stocks
  for delete to authenticated using (user_id = (select auth.uid()));
