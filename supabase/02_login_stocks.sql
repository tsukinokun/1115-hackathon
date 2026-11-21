-- =====================================================================
-- Google ログインとストック（Issue #5）、写真 URL の制限。
-- schema.sql（と migrations/20261121_likes_comments.sql）のあとに流す。
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

-- ---------- 写真 URL は「自分がアップロードした写真」だけ ----------
-- アプリ（Server Actions）でも確かめているが、公開キーで Supabase に直接書き込まれると
-- 外部サイトの画像 URL を入れられてしまうので、DB 側でも同じ制限をかける。
-- 形: https://<project>.supabase.co/storage/v1/object/public/recipe-photos/<自分の user id>/...
create or replace function public.is_own_photo(url text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select url is null or (
    url ~ ('^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/recipe-photos/'
           || (select auth.uid())::text || '/[A-Za-z0-9._/-]+$')
    and position('..' in url) = 0
  );
$$;

-- レシピのカバー写真
drop policy if exists "own recipe" on public.recipes;
create policy "own recipe" on public.recipes
  for all using (auth.uid() = author_id)
  with check (auth.uid() = author_id and public.is_own_photo(cover_image));

-- 手順の写真
drop policy if exists "own recipe steps" on public.recipe_steps;
create policy "own recipe steps" on public.recipe_steps
  for all using (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = auth.uid())
              and public.is_own_photo(image_url));

-- つくれぽ写真
drop policy if exists "post photo" on public.recipe_photos;
create policy "post photo" on public.recipe_photos
  for insert with check (auth.uid() = posted_by and public.is_own_photo(url));

-- コメントの写真
drop policy if exists "comment as self" on public.recipe_comments;
create policy "comment as self" on public.recipe_comments
  for insert to authenticated with check (auth.uid() = user_id and public.is_own_photo(photo_url));
