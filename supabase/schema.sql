-- =====================================================================
-- きょうのすき: Supabase テーブル定義（草案）
-- data/*.json と lib/types.ts と同じ形。まだ適用はしていない。
--
-- 写真は Storage の公開バケット `recipe-photos` に置き、
-- 各テーブルには公開 URL（または storage のパス）を保存する。
--
-- RLS の方針: だれでも読める / 書けるのは本人だけ
-- =====================================================================

-- ---------- 投稿者 ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ---------- 食材マスタ（ユーザーが増やせる） ----------
create type public.ingredient_category as enum
  ('vegetable', 'meat', 'fish', 'egg_dairy', 'soy', 'grain', 'seasoning', 'other');

create table public.ingredients (
  id          text primary key,                 -- 例: 'egg'。ユーザー追加分は uuid 文字列でもよい
  name        text not null,
  reading     text,                             -- ひらがな読み（検索用）
  aliases     text[] not null default '{}',     -- 表記ゆれ
  category    public.ingredient_category not null default 'other',
  image       text,                             -- 写真 URL。null なら自動イラスト
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create unique index ingredients_name_key on public.ingredients (name);

-- ---------- レシピ ----------
create table public.recipes (
  id           text primary key default gen_random_uuid()::text,
  title        text not null,
  catch        text not null default '',
  description  text,
  author_id    uuid references public.profiles (id) on delete set null,
  cover_image  text,
  minutes      int  not null default 15 check (minutes > 0),
  servings     int  not null default 1  check (servings > 0),
  tags         jsonb not null default '{}'::jsonb,   -- { "comfort": 3, "warm": 2 } 診断用の重み
  created_at   timestamptz not null default now()
);

-- 材料。ingredient_id が無くても name で照合する（自由記述・調味料）
create table public.recipe_ingredients (
  id             bigint generated always as identity primary key,
  recipe_id      text not null references public.recipes (id) on delete cascade,
  position       int  not null,
  ingredient_id  text references public.ingredients (id) on delete set null,
  name           text not null,
  amount         text not null default ''
);
create index on public.recipe_ingredients (recipe_id, position);
create index on public.recipe_ingredients (ingredient_id);

-- 手順。何工程でも入る。position で並べる
create table public.recipe_steps (
  id         bigint generated always as identity primary key,
  recipe_id  text not null references public.recipes (id) on delete cascade,
  position   int  not null,
  text       text not null,
  image_url  text,
  unique (recipe_id, position)
);

-- 完成写真・途中経過。他のユーザーの「つくれぽ」もここに入れられる
create table public.recipe_photos (
  id          bigint generated always as identity primary key,
  recipe_id   text not null references public.recipes (id) on delete cascade,
  url         text not null,
  caption     text,
  kind        text not null check (kind in ('finished', 'process')),
  posted_by   uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on public.recipe_photos (recipe_id, created_at);

-- ---------- 診断の質問 ----------
create table public.questions (
  id          text primary key default gen_random_uuid()::text,
  kind        text not null check (kind in ('mood', 'condition')),
  text        text not null,
  note        text,
  multiple    boolean not null default false,
  priority    int not null default 0,          -- 大きいほど扉に貼られやすい
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.question_options (
  id           text not null,
  question_id  text not null references public.questions (id) on delete cascade,
  position     int  not null,
  label        text not null,
  emoji        text,
  image        text,
  tags         jsonb not null default '{}'::jsonb,
  primary key (question_id, id)
);

-- ---------- RLS ----------
alter table public.profiles            enable row level security;
alter table public.ingredients         enable row level security;
alter table public.recipes             enable row level security;
alter table public.recipe_ingredients  enable row level security;
alter table public.recipe_steps        enable row level security;
alter table public.recipe_photos       enable row level security;
alter table public.questions           enable row level security;
alter table public.question_options    enable row level security;

-- 読み取りはだれでも
create policy "read all" on public.profiles           for select using (true);
create policy "read all" on public.ingredients        for select using (true);
create policy "read all" on public.recipes            for select using (true);
create policy "read all" on public.recipe_ingredients for select using (true);
create policy "read all" on public.recipe_steps       for select using (true);
create policy "read all" on public.recipe_photos      for select using (true);
create policy "read all" on public.questions          for select using (true);
create policy "read all" on public.question_options   for select using (true);

-- 書き込みは本人のものだけ（例。子テーブルは親レシピの author で判定）
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "add ingredient" on public.ingredients
  for insert with check (auth.uid() = created_by);

create policy "own recipe" on public.recipes
  for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "own recipe ingredients" on public.recipe_ingredients
  for all using (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = auth.uid()));

create policy "own recipe steps" on public.recipe_steps
  for all using (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = auth.uid()));

-- 写真はだれでも投稿できる（つくれぽ）。消せるのは投稿者だけ
create policy "post photo" on public.recipe_photos
  for insert with check (auth.uid() = posted_by);
create policy "delete own photo" on public.recipe_photos
  for delete using (auth.uid() = posted_by);

create policy "own question" on public.questions
  for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

create policy "own question options" on public.question_options
  for all using (exists (select 1 from public.questions q where q.id = question_id and q.created_by = auth.uid()))
  with check (exists (select 1 from public.questions q where q.id = question_id and q.created_by = auth.uid()));
