// data/*.json から supabase/seed.sql を作る。JSON を編集したら `npm run db:seed` を実行する。
// 何度流しても同じ結果になる（初期データの行だけを上書きする。ユーザー投稿は消さない）。
import { readFileSync, writeFileSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const json = JSON.stringify({
  ingredients: read("data/ingredients.json"),
  recipes: read("data/recipes.json"),
  questions: read("data/questions.json"),
});
const TAG = "$seed$";
if (json.includes(TAG)) throw new Error(`data に ${TAG} が含まれています`);

const sql = `-- このファイルは scripts/gen-seed.mjs が生成する。直接編集しないこと。
-- schema.sql を流したあと、Supabase の SQL Editor でこのファイルを実行する。
begin;

create temp table seed on commit drop as select ${TAG}${json}${TAG}::jsonb as j;

-- 食材
-- created_at は JSON の並び順（読み込み時に created_at 順で並べるため）
insert into public.ingredients (id, name, reading, aliases, category, image, created_at)
select e->>'id', e->>'name', e->>'reading',
       coalesce(array(select jsonb_array_elements_text(e->'aliases')), '{}'),
       (e->>'category')::public.ingredient_category, e->>'image',
       '2026-11-01'::timestamptz + make_interval(secs => ord)
from seed, jsonb_array_elements(j->'ingredients') with ordinality t(e, ord)
on conflict (id) do update set
  name = excluded.name, reading = excluded.reading, aliases = excluded.aliases,
  category = excluded.category, image = excluded.image, created_at = excluded.created_at;

-- レシピ（初期データは author_id なし、author_name に作者名）
insert into public.recipes (id, title, catch, description, author_name, cover_image, minutes, servings, tags, created_at)
select e->>'id', e->>'title', e->>'catch', e->>'description', e->'author'->>'name', e->>'coverImage',
       (e->>'minutes')::int, (e->>'servings')::int, e->'tags', (e->>'createdAt')::timestamptz
from seed, jsonb_array_elements(j->'recipes') e
on conflict (id) do update set
  title = excluded.title, catch = excluded.catch, description = excluded.description,
  author_name = excluded.author_name, cover_image = excluded.cover_image, minutes = excluded.minutes,
  servings = excluded.servings, tags = excluded.tags, created_at = excluded.created_at;

-- 初期レシピの子テーブルは入れ直す（投稿された写真 posted_by あり は残す）
delete from public.recipe_ingredients where recipe_id in (select e->>'id' from seed, jsonb_array_elements(j->'recipes') e);
delete from public.recipe_steps       where recipe_id in (select e->>'id' from seed, jsonb_array_elements(j->'recipes') e);
delete from public.recipe_photos      where posted_by is null
                                        and recipe_id in (select e->>'id' from seed, jsonb_array_elements(j->'recipes') e);

insert into public.recipe_ingredients (recipe_id, position, ingredient_id, name, amount)
select r->>'id', i.ord - 1, i.e->>'ingredientId', i.e->>'name', i.e->>'amount'
from seed, jsonb_array_elements(j->'recipes') r, jsonb_array_elements(r->'ingredients') with ordinality i(e, ord);

insert into public.recipe_steps (recipe_id, position, text, image_url)
select r->>'id', s.ord - 1, s.e->>'text', s.e->>'image'
from seed, jsonb_array_elements(j->'recipes') r, jsonb_array_elements(r->'steps') with ordinality s(e, ord);

-- created_at を少しずつずらして、JSON の並び順で表示されるようにする
insert into public.recipe_photos (recipe_id, url, caption, kind, created_at)
select r->>'id', p.e->>'url', p.e->>'caption', p.e->>'kind',
       (r->>'createdAt')::timestamptz + make_interval(secs => p.ord)
from seed, jsonb_array_elements(j->'recipes') r, jsonb_array_elements(r->'photos') with ordinality p(e, ord);

-- 質問
insert into public.questions (id, kind, text, note, multiple, priority, created_at)
select q->>'id', q->>'kind', q->>'text', q->>'note', (q->>'multiple')::boolean, coalesce((q->>'priority')::int, 0),
       '2026-11-01'::timestamptz + make_interval(secs => ord)
from seed, jsonb_array_elements(j->'questions') with ordinality t(q, ord)
on conflict (id) do update set
  kind = excluded.kind, text = excluded.text, note = excluded.note,
  multiple = excluded.multiple, priority = excluded.priority, created_at = excluded.created_at;

delete from public.question_options where question_id in (select q->>'id' from seed, jsonb_array_elements(j->'questions') q);
insert into public.question_options (id, question_id, position, label, emoji, image, tags)
select o.e->>'id', q->>'id', o.ord - 1, o.e->>'label', o.e->>'emoji', o.e->>'image', o.e->'tags'
from seed, jsonb_array_elements(j->'questions') q, jsonb_array_elements(q->'options') with ordinality o(e, ord);

commit;
`;
writeFileSync(new URL("../supabase/seed.sql", import.meta.url), sql);
console.log("wrote supabase/seed.sql");
