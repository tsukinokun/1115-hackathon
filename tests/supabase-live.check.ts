// 本物の Supabase に対する通しの動作確認。.env.local の URL と公開キーを使う。
//   npm run check:supabase
// 確認用に作ったレシピ・写真は最後に消す（匿名ユーザー1人は auth.users に残るが害はない）。
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import ingredientsJson from "@/data/ingredients.json";
import questionsJson from "@/data/questions.json";
import recipesJson from "@/data/recipes.json";
import {
  INGREDIENT_SELECT,
  QUESTION_SELECT,
  RECIPE_SELECT,
  toIngredient,
  toQuestion,
  toRecipe,
  type IngredientRow,
  type QuestionRow,
  type RecipeRow,
} from "@/lib/supabase/mappers";
import { normalizeSupabaseUrl, PHOTO_BUCKET } from "@/lib/supabase/env";

const env = loadEnv("development", process.cwd(), "");
const URL_ = normalizeSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
if (!URL_ || !KEY) throw new Error(".env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を書いてください");
if (URL_ !== env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "")) {
  console.warn(`NEXT_PUBLIC_SUPABASE_URL の後ろのパスは無視して ${URL_} を使います`);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } } as const;
const anon = createClient(URL_, KEY, opts);
const OTHER = "00000000-0000-4000-8000-000000000000";
// 1x1 の透明 PNG
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="), (c) => c.charCodeAt(0));

let me: SupabaseClient;
let uid = "";
let recipeId = "";
let photoPath = "";

describe(`Supabase (${new URL(URL_).host})`, () => {
  describe("読み込み（だれでも）", () => {
    it("レシピ21品が data/recipes.json と同じ形で読める", async () => {
      const { data, error } = await anon.from("recipes").select(RECIPE_SELECT).order("created_at");
      expect(error).toBeNull();
      const seeded = new Set(recipesJson.map((r) => r.id));
      expect((data as unknown as RecipeRow[]).filter((r) => seeded.has(r.id)).map(toRecipe)).toEqual(recipesJson);
    });
    it("質問・食材も同じ形で読める", async () => {
      const q = await anon.from("questions").select(QUESTION_SELECT).order("created_at");
      expect(q.error).toBeNull();
      expect((q.data as unknown as QuestionRow[]).map(toQuestion)).toEqual(questionsJson);
      const i = await anon.from("ingredients").select(INGREDIENT_SELECT).order("created_at");
      expect(i.error).toBeNull();
      const seeded = new Set(ingredientsJson.map((x) => x.id));
      expect((i.data as unknown as IngredientRow[]).filter((x) => seeded.has(x.id)).map(toIngredient)).toEqual(ingredientsJson);
    });
    it("未ログインでは書き込めない", async () => {
      expect((await anon.from("recipes").select("id").limit(1)).error).toBeNull(); // まず接続できていること
      expect((await anon.from("recipes").insert({ title: "x" })).error).not.toBeNull();
      expect((await anon.rpc("create_recipe", { p_title: "x", p_catch: "", p_description: null, p_minutes: 1, p_servings: 1, p_tags: {}, p_cover_image: null, p_ingredients: [], p_steps: [] })).error).not.toBeNull();
    });
  });

  describe("投稿（匿名ログイン）", () => {
    beforeAll(async () => {
      const sb = createClient(URL_, KEY, opts);
      const { data, error } = await sb.auth.signInAnonymously({ options: { data: { name: "動作確認" } } });
      if (error || !data.session) throw new Error(`匿名ログインに失敗: ${error?.message}（Authentication で Allow anonymous sign-ins を ON に）`);
      uid = data.session.user.id;
      me = sb; // ログインしたクライアント（DB も Storage もこのユーザーとして動く）
    });

    it("profiles が自動で作られている", async () => {
      const { data, error } = await me.from("profiles").select("name").eq("id", uid).single();
      expect(error).toBeNull();
      expect(data?.name).toBe("動作確認");
    });

    it("写真: 自分のフォルダにはアップロードでき、公開 URL で見られる", async () => {
      photoPath = `${uid}/check-${Date.now()}.png`;
      const up = await me.storage.from(PHOTO_BUCKET).upload(photoPath, PNG, { contentType: "image/png" });
      expect(up.error).toBeNull();
      const url = me.storage.from(PHOTO_BUCKET).getPublicUrl(photoPath).data.publicUrl;
      expect((await fetch(url)).status).toBe(200);
    });

    it("写真: 他人のフォルダにはアップロードできない", async () => {
      const up = await me.storage.from(PHOTO_BUCKET).upload(`${OTHER}/x.png`, PNG, { contentType: "image/png" });
      expect(up.error).not.toBeNull();
    });

    it("レシピを投稿でき、作者名つきで読める", async () => {
      const cover = me.storage.from(PHOTO_BUCKET).getPublicUrl(photoPath).data.publicUrl;
      const { data, error } = await me.rpc("create_recipe", {
        p_title: "【動作確認】卵かけごはん", p_catch: "", p_description: null, p_minutes: 3, p_servings: 1,
        p_tags: { quick: 3 }, p_cover_image: cover,
        p_ingredients: [{ ingredientId: "egg", name: "卵", amount: "1個" }, { name: "しょうゆ", amount: "少々" }],
        p_steps: [{ text: "のせる" }, { text: "かける" }],
      });
      expect(error).toBeNull();
      recipeId = data as string;
      const row = await anon.from("recipes").select(RECIPE_SELECT).eq("id", recipeId).single();
      expect(row.error).toBeNull();
      const r = toRecipe(row.data as unknown as RecipeRow);
      expect(r).toMatchObject({ title: "【動作確認】卵かけごはん", author: { name: "動作確認" }, coverImage: cover });
      expect(r.ingredients.map((i) => i.name)).toEqual(["卵", "しょうゆ"]);
    });

    it("つくれぽ: 自分の名義は OK、他人の名義は NG", async () => {
      const url = me.storage.from(PHOTO_BUCKET).getPublicUrl(photoPath).data.publicUrl;
      expect((await me.from("recipe_photos").insert({ recipe_id: recipeId, url, kind: "finished", posted_by: uid })).error).toBeNull();
      expect((await me.from("recipe_photos").insert({ recipe_id: recipeId, url, kind: "finished", posted_by: OTHER })).error).not.toBeNull();
    });

    it("なりすまし・他人のレシピの削除はできない", async () => {
      expect((await me.from("recipes").insert({ title: "x", author_id: OTHER })).error).not.toBeNull();
      await me.from("recipes").delete().eq("id", "fuwatoro-omurice");
      expect((await anon.from("recipes").select("id").eq("id", "fuwatoro-omurice")).data).toHaveLength(1);
    });

    afterAll(async () => {
      // 後片づけ（レシピを消すと材料・手順・写真の行も消える）
      if (recipeId) await me.from("recipes").delete().eq("id", recipeId);
      if (photoPath) await me.storage.from(PHOTO_BUCKET).remove([photoPath]);
      const left = await anon.from("recipes").select("id").like("title", "【動作確認】%");
      if (left.data?.length) console.warn("確認用レシピが残っています:", left.data);
      await me?.auth.signOut();
    });
  });
});
