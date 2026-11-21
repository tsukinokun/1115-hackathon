// 投稿内容のチェック（Server Actions から呼ぶ純粋関数）。
// クライアントから来る値は信用しないので、形・長さ・範囲をすべて確かめる。
import type { IngredientCategory, RecipePhoto, TagWeights } from "../types";

export type NewRecipeInput = {
  title: string;
  catch?: string;
  description?: string;
  minutes: number;
  servings: number;
  /** 診断用の重み。キーは questions.json のタグ（comfort, spicy ...）。0〜5 */
  tags: TagWeights;
  coverImage?: string;
  ingredients: { ingredientId?: string; name: string; amount?: string }[];
  steps: { text: string; image?: string }[];
};

export type NewPhotoInput = {
  recipeId: string;
  url: string;
  caption?: string;
  kind: RecipePhoto["kind"];
};

export type NewIngredientInput = {
  name: string;
  reading?: string;
  aliases?: string[];
  category: IngredientCategory;
};

export type Invalid = { ok: false; error: "invalid_input"; message: string };
export type Valid<T> = { ok: true; value: T };

const CATEGORIES: IngredientCategory[] = ["vegetable", "meat", "fish", "egg_dairy", "soy", "grain", "seasoning", "other"];

class Bad extends Error {}
const fail = (message: string): never => {
  throw new Bad(message);
};

function obj(v: unknown, what: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) fail(`${what} の形が正しくありません`);
  return v as Record<string, unknown>;
}

function str(v: unknown, what: string, max: number, { required = true } = {}): string | undefined {
  if (v === undefined || v === null || v === "") {
    if (required) fail(`${what} を入力してください`);
    return undefined;
  }
  if (typeof v !== "string") return fail(`${what} は文字列にしてください`);
  const s = v.trim();
  if (required && !s) fail(`${what} を入力してください`);
  if ([...s].length > max) fail(`${what} は ${max} 文字以内にしてください`);
  return s || undefined;
}

function int(v: unknown, what: string, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    fail(`${what} は ${min}〜${max} の整数にしてください`);
  }
  return v as number;
}

function list(v: unknown, what: string, min: number, max: number): unknown[] {
  if (!Array.isArray(v)) return fail(`${what} は配列にしてください`);
  if (v.length < min || v.length > max) fail(`${what} は ${min}〜${max} 個にしてください`);
  return v;
}

function image(v: unknown, what: string, isAllowedImage: (url: string) => boolean): string | undefined {
  const url = str(v, what, 500, { required: false });
  if (url && !isAllowedImage(url)) fail(`${what} はアップロードした写真の URL にしてください`);
  return url;
}

function run<T>(f: () => T): Valid<T> | Invalid {
  try {
    return { ok: true, value: f() };
  } catch (e) {
    if (e instanceof Bad) return { ok: false, error: "invalid_input", message: e.message };
    throw e;
  }
}

export function validateRecipe(input: unknown, isAllowedImage: (url: string) => boolean) {
  return run<NewRecipeInput>(() => {
    const o = obj(input, "レシピ");
    const tagsObj = obj(o.tags ?? {}, "tags");
    const tagKeys = Object.keys(tagsObj);
    if (tagKeys.length > 20) fail("tags は 20 個までにしてください");
    const tags: TagWeights = {};
    for (const k of tagKeys) {
      if (!/^[a-z_]{1,24}$/.test(k)) fail(`タグ「${k}」は英小文字にしてください`);
      tags[k] = int(tagsObj[k], `タグ ${k} の重み`, 0, 5);
    }
    return {
      title: str(o.title, "料理名", 60)!,
      catch: str(o.catch, "ひとこと", 80, { required: false }),
      description: str(o.description, "説明", 500, { required: false }),
      minutes: int(o.minutes, "調理時間（分）", 1, 600),
      servings: int(o.servings, "何人分", 1, 20),
      tags,
      coverImage: image(o.coverImage, "カバー写真", isAllowedImage),
      ingredients: list(o.ingredients, "材料", 1, 40).map((v, i) => {
        const x = obj(v, `材料${i + 1}`);
        return {
          ingredientId: str(x.ingredientId, `材料${i + 1} の id`, 64, { required: false }),
          name: str(x.name, `材料${i + 1} の名前`, 40)!,
          amount: str(x.amount, `材料${i + 1} の分量`, 40, { required: false }) ?? "",
        };
      }),
      steps: list(o.steps, "手順", 1, 30).map((v, i) => {
        const x = obj(v, `手順${i + 1}`);
        return {
          text: str(x.text, `手順${i + 1}`, 400)!,
          image: image(x.image, `手順${i + 1} の写真`, isAllowedImage),
        };
      }),
    };
  });
}

export function validatePhoto(input: unknown, isAllowedImage: (url: string) => boolean) {
  return run<NewPhotoInput>(() => {
    const o = obj(input, "写真");
    if (o.kind !== "finished" && o.kind !== "process") fail("kind は finished か process にしてください");
    const url = image(o.url, "写真", isAllowedImage);
    if (!url) fail("写真 を指定してください");
    return {
      recipeId: str(o.recipeId, "recipeId", 64)!,
      url: url!,
      caption: str(o.caption, "ひとこと", 60, { required: false }),
      kind: o.kind as RecipePhoto["kind"],
    };
  });
}

export function validateIngredient(input: unknown) {
  return run<NewIngredientInput>(() => {
    const o = obj(input, "食材");
    if (!CATEGORIES.includes(o.category as IngredientCategory)) fail("category が正しくありません");
    const reading = str(o.reading, "読み", 30, { required: false });
    if (reading && !/^[\p{Script=Hiragana}ー]+$/u.test(reading)) fail("読み はひらがなにしてください");
    const aliases = o.aliases === undefined ? [] : list(o.aliases, "別名", 0, 10);
    return {
      name: str(o.name, "食材名", 30)!,
      reading,
      aliases: aliases.map((a, i) => str(a, `別名${i + 1}`, 30)!),
      category: o.category as IngredientCategory,
    };
  });
}

export function validateProfileName(input: unknown) {
  return run<string>(() => str(input, "名前", 20)!);
}
