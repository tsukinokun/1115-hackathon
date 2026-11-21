-- =====================================================================
-- いいね（スキ）・コメント
-- すでに schema.sql を流した DB には、このファイルだけを SQL Editor で流す。
-- 何度流しても大丈夫（if not exists / drop policy if exists）。
-- schema.sql の末尾にも同じ内容が入っているので、新しく作る DB は schema.sql だけでよい。
-- =====================================================================

-- ---------- スキ（1人1回。もう一度押すと取り消し） ----------
create table if not exists public.recipe_likes (
  recipe_id   text not null references public.recipes (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (recipe_id, user_id)
);
create index if not exists recipe_likes_user_idx on public.recipe_likes (user_id);

-- ---------- コメント（写真は任意。recipe-photos/<user id>/comments/... に置く） ----------
create table if not exists public.recipe_comments (
  id          bigint generated always as identity primary key,
  recipe_id   text not null references public.recipes (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 300),
  photo_url   text,
  created_at  timestamptz not null default now()
);
create index if not exists recipe_comments_recipe_idx on public.recipe_comments (recipe_id, created_at desc);

-- ---------- 件数（レシピ一覧に出す用） ----------
create or replace view public.recipe_reaction_counts
with (security_invoker = true) as
select
  r.id as recipe_id,
  (select count(*) from public.recipe_likes l where l.recipe_id = r.id)::int as likes,
  (select count(*) from public.recipe_comments c where c.recipe_id = r.id)::int as comments
from public.recipes r;

-- ---------- RLS: だれでも読める / 書けるのは本人だけ ----------
alter table public.recipe_likes    enable row level security;
alter table public.recipe_comments enable row level security;

drop policy if exists "read all" on public.recipe_likes;
create policy "read all" on public.recipe_likes for select using (true);
drop policy if exists "like as self" on public.recipe_likes;
create policy "like as self" on public.recipe_likes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "unlike own" on public.recipe_likes;
create policy "unlike own" on public.recipe_likes for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "read all" on public.recipe_comments;
create policy "read all" on public.recipe_comments for select using (true);
drop policy if exists "comment as self" on public.recipe_comments;
create policy "comment as self" on public.recipe_comments for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "delete own comment" on public.recipe_comments;
create policy "delete own comment" on public.recipe_comments for delete to authenticated using (auth.uid() = user_id);

grant select on public.recipe_reaction_counts to anon, authenticated;
