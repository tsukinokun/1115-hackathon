# バックエンド（Supabase）

## 全体像

| 役割 | 場所 |
| --- | --- |
| 読み込み（質問・レシピ・食材） | `lib/repository.ts`。Supabase があればそこから、無ければ `data/*.json` |
| DB → アプリの型の変換 | `lib/supabase/mappers.ts` |
| 投稿（レシピ・つくれぽ写真・食材・名前） | `app/actions/posting.ts`（Server Actions） |
| 匿名ログイン・写真アップロード（ブラウザ） | `lib/supabase/browser.ts` |
| 入力チェック | `lib/posting/validate.ts` |
| テーブル定義・RLS・投稿用関数・Storage | `supabase/schema.sql` |
| 初期データ | `supabase/seed.sql`（`npm run db:seed` で `data/*.json` から生成） |

- 読み込みは数分キャッシュします。投稿した直後は Server Action がキャッシュを捨てるので、次の表示から新しいデータが出ます。
- Supabase がエラーを返したときもローカル JSON に切り替えるので、デモ中に画面が止まりません（サーバーのログにエラーが出ます）。

## Supabase のセットアップ

1. SQL Editor で `supabase/schema.sql` → `supabase/seed.sql` の順に実行する
2. Authentication → Sign In / Providers → **Allow anonymous sign-ins** を ON にする（投稿に必要）
3. `.env.example` を `.env.local` にコピーして URL と anon キーを入れる。Vercel でも同じ2つを Environment Variables に入れる
4. `data/*.json` を編集したら `npm run db:seed` で `seed.sql` を作り直し、もう一度 SQL Editor で実行する（何度流しても大丈夫。ユーザーの投稿は消えません）

## フロントからの使い方（投稿）

ログイン画面は不要です。最初の投稿のときに匿名ログインします。
レシピ投稿画面（`/recipes/new`）は `app/recipes/new/_lib/submitRecipe.ts` からこの仕組みを使っています。Supabase 未設定のときは、これまでどおりブラウザに仮保存します。

```tsx
"use client";
import { createRecipe, addRecipePhoto, addIngredient, updateProfileName } from "@/app/actions/posting";
import { ensureSignedIn, uploadPhoto } from "@/lib/supabase/browser";

// レシピを投稿
const token = await ensureSignedIn("はなこ");      // 初回だけ名前が「by はなこ」になる
const cover = file ? await uploadPhoto(file) : undefined; // 写真は先にアップロードして URL をもらう
const res = await createRecipe(token!, {
  title: "卵かけごはん",
  catch: "3分で、いつもの安心",
  minutes: 3,
  servings: 1,
  tags: { quick: 3, comfort: 2, safe: 2 },         // 診断用。キーは questions.json の tags と同じ、重みは 0〜5
  coverImage: cover,
  ingredients: [{ ingredientId: "egg", name: "卵", amount: "1個" }, { name: "しょうゆ", amount: "少々" }],
  steps: [{ text: "ごはんに卵をのせる" }, { text: "しょうゆをかける" }],
});
if (!res.ok) alert(res.message);                   // message はそのまま画面に出せる日本語

// つくれぽ（完成写真・途中経過）
await addRecipePhoto(token!, { recipeId: "gapao", url: await uploadPhoto(file), kind: "finished", caption: "できた！" });

// 食材マスタに追加（同じ名前があればその id が返る）
await addIngredient(token!, { name: "パクチー", reading: "ぱくちー", aliases: ["香菜"], category: "vegetable" });

// 投稿者名を変える
await updateProfileName(token!, "はなこ");
```

- 戻り値は `{ ok: true, ... }` か `{ ok: false, error, message }`
- `error` の種類: `invalid_input`（入力の不備）/ `unauthorized`（ログインし直し）/ `forbidden` / `not_found` / `invalid_reference`（存在しない食材 id など）/ `supabase_not_configured` / `server_error`
- 写真は本人がアップロードしたもの（`recipe-photos/<自分のid>/...`）しか指定できません。5MB まで、jpeg/png/webp/gif
- Supabase 未設定のとき `ensureSignedIn()` は `null` を返します。投稿ボタンを隠すのに使えます

## セキュリティ

- 書き込みはすべてユーザー本人の権限で行い、RLS が本人以外の名義を拒否します（service_role キーは使っていません）
- レシピ投稿は `create_recipe` 関数で、本体・材料・手順を 1 トランザクションで入れます。途中で失敗したら何も残りません
- 匿名ログインなので、だれでも投稿できます。荒らし対策（通報・削除画面など）はありません

## データ

- `data/recipes.json`: もとの3品 ＋ 海外料理18品（作者「せかいの台所」）。国は `country_xx`（重み3）と `region_xx`（重み2）のタグで持ちます（`lib/countries.ts` の `countryTags` と同じ付け方）。レシピカードの国旗スタンプはこのタグから出ます
- `data/ingredients.json`: 海外料理に必要な食材と調味料を29件追加（調味料は category `seasoning` なので、診断の一致率の分母に入りません）
- レシピの `tags` は、質問で使われているタグと国・地域のタグだけを使っています（テストでチェック）
- `data/*.json` を変えたら、`npm run db:seed` → Supabase の SQL Editor で `supabase/seed.sql` を流し直してください。流し直さないと、Supabase を読む環境では古いデータのままです

## 開発

```bash
npm test          # vitest
npm run db:seed   # data/*.json → supabase/seed.sql
npm run build
```
