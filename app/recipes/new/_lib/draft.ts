import type { IngredientCategory, Question, TagWeights } from "@/lib/types";
import { LIMITS } from "./limits";
import { buildTags, type MoodPicks } from "./tags";

/**
 * バックエンドに送る形。lib/posting/validate.ts の NewRecipeInput と同じ。
 * バックエンドがマージされたら、この型は
 *   import type { NewRecipeInput as RecipeInput } from "@/lib/posting/validate";
 * に置き換える（中身は同じなので他は変えなくてよい）。
 */
export type RecipeInput = {
  title: string;
  catch?: string;
  description?: string;
  minutes: number;
  servings: number;
  tags: TagWeights;
  coverImage?: string;
  ingredients: { ingredientId?: string; name: string; amount?: string }[];
  steps: { text: string; image?: string }[];
};

/** 写真は送信の直前までファイルで持つ。preview は画面表示用の object URL */
export type DraftPhoto = { file: File; preview: string };

export type DraftIngredient = {
  key: string;
  ingredientId?: string;
  name: string;
  category?: IngredientCategory;
  image?: string | null;
  amount: string;
};

export type DraftStep = { key: string; text: string; photo?: DraftPhoto };

/** 画面の状態 */
export type RecipeDraft = {
  title: string;
  catch: string;
  description: string;
  authorName: string;
  minutes: number;
  servings: number;
  cover?: DraftPhoto;
  ingredients: DraftIngredient[];
  steps: DraftStep[];
  moods: MoodPicks;
  /** 国・地域コード（ISO 3166-1）。タグ country_xx / region_xx になる */
  countries: string[];
};

/** 工程を足したとき用（クリック時にだけ呼ぶ。描画中に呼ぶと SSR とズレる） */
export const newStep = (text = ""): DraftStep => ({ key: Math.random().toString(36).slice(2, 10), text });

/** 初期状態。サーバーとクライアントで同じになるよう、乱数は使わない */
export const emptyDraft = (): RecipeDraft => ({
  title: "",
  catch: "",
  description: "",
  authorName: "",
  minutes: 15,
  servings: 1,
  ingredients: [],
  steps: [{ key: "step-first", text: "" }],
  moods: {},
  countries: [],
});

/** 写真の URL（アップロード後に分かる）を受け取って、送る形にする */
export function toRecipeInput(
  draft: RecipeDraft,
  questions: Question[],
  photoUrls: { cover?: string; steps?: (string | undefined)[] } = {},
): RecipeInput {
  const opt = (s: string) => s.trim() || undefined;
  return {
    title: draft.title.trim(),
    catch: opt(draft.catch),
    description: opt(draft.description),
    minutes: draft.minutes,
    servings: draft.servings,
    tags: buildTags(questions, draft.moods, draft.countries),
    coverImage: photoUrls.cover,
    ingredients: draft.ingredients.map((i) => ({
      ...(i.ingredientId ? { ingredientId: i.ingredientId } : {}),
      name: i.name.trim(),
      amount: opt(i.amount),
    })),
    steps: draft.steps
      .filter((s) => s.text.trim())
      .map((s) => ({ text: s.text.trim(), image: photoUrls.steps?.[draft.steps.indexOf(s)] })),
  };
}

export type DraftErrors = Partial<Record<"title" | "catch" | "description" | "authorName" | "ingredients" | "steps", string>>;

const len = (s: string) => [...s.trim()].length;

/** 送る前のチェック。サーバーでも同じチェックがあるので、ここは分かりやすさ優先 */
export function checkDraft(d: RecipeDraft): DraftErrors {
  const e: DraftErrors = {};
  if (!d.title.trim()) e.title = "料理名を書いてね";
  else if (len(d.title) > LIMITS.title) e.title = `料理名は${LIMITS.title}文字まで`;
  if (len(d.catch) > LIMITS.catch) e.catch = `ひとことは${LIMITS.catch}文字まで`;
  if (len(d.description) > LIMITS.description) e.description = `メモは${LIMITS.description}文字まで`;
  if (len(d.authorName) > LIMITS.authorName) e.authorName = `名前は${LIMITS.authorName}文字まで`;

  if (d.ingredients.length < LIMITS.ingredients.min) e.ingredients = "材料をひとつ以上のせてね";
  else if (d.ingredients.length > LIMITS.ingredients.max) e.ingredients = `材料は${LIMITS.ingredients.max}個まで`;
  else if (d.ingredients.some((i) => len(i.amount) > LIMITS.amount)) e.ingredients = `分量は${LIMITS.amount}文字まで`;

  const steps = d.steps.filter((s) => s.text.trim());
  if (steps.length < LIMITS.steps.min) e.steps = "つくりかたを一行でも書いてね";
  else if (steps.length > LIMITS.steps.max) e.steps = `工程は${LIMITS.steps.max}個まで`;
  else if (steps.some((s) => len(s.text) > LIMITS.stepText)) e.steps = `1工程は${LIMITS.stepText}文字まで`;
  return e;
}
