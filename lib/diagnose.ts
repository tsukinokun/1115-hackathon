import { keysOf, normalizeName } from "./ingredients";
import type { Answers, DiagnosisResult, Ingredient, PantryItem, Question, Recipe, TagWeights } from "./types";

const dot = (a: TagWeights, b: TagWeights) =>
  Object.keys(a).reduce((sum, k) => sum + a[k] * (b[k] ?? 0), 0);

const norm = (a: TagWeights) => Math.sqrt(dot(a, a));

/**
 * 回答と冷蔵庫の中身からレシピを並べ替える純関数。
 * - 気分・条件: 選んだ option のタグを足したベクトルと、レシピのタグのコサイン類似度
 * - 食材: レシピ材料のうち手持ちに含まれる割合。
 *         ingredientId が同じか、名前（別名・読み含む）が正規化して一致すれば OK。
 *         なので自由入力の食材や、ID なしで投稿されたレシピ材料も拾える。
 *         調味料は割合の分母に入れない（無くても作れることが多いので）。
 */
export function diagnose(
  questions: Question[],
  answers: Answers,
  pantry: PantryItem[],
  recipes: Recipe[],
  ingredients: Ingredient[] = [],
): DiagnosisResult[] {
  const moodPicks = questions.flatMap((q) =>
    q.options.filter((o) => answers[q.id]?.includes(o.id)),
  );

  const user: TagWeights = {};
  for (const option of moodPicks) {
    for (const [tag, w] of Object.entries(option.tags)) user[tag] = (user[tag] ?? 0) + w;
  }

  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const ownedIds = new Set(pantry.map((p) => p.ingredientId).filter(Boolean));
  const ownedNames = new Set<string>();
  for (const p of pantry) {
    const master = p.ingredientId ? byId.get(p.ingredientId) : undefined;
    for (const k of master ? keysOf(master) : [normalizeName(p.name)]) ownedNames.add(k);
  }

  const has = (ri: Recipe["ingredients"][number]) => {
    if (ri.ingredientId && ownedIds.has(ri.ingredientId)) return true;
    const master = ri.ingredientId ? byId.get(ri.ingredientId) : undefined;
    const keys = master ? keysOf(master) : new Set([normalizeName(ri.name)]);
    return [...keys].some((k) => ownedNames.has(k));
  };
  const isSeasoning = (ri: Recipe["ingredients"][number]) =>
    ri.ingredientId ? byId.get(ri.ingredientId)?.category === "seasoning" : false;

  return recipes
    .map((recipe) => {
      const cos = norm(user) && norm(recipe.tags) ? dot(user, recipe.tags) / (norm(user) * norm(recipe.tags)) : 0;

      const matched = recipe.ingredients.filter(has);
      const main = recipe.ingredients.filter((ri) => !isSeasoning(ri));
      const ratio = main.length ? main.filter(has).length / main.length : 0;

      const moodReasons = moodPicks
        .map((o) => ({ label: o.label, score: dot(o.tags, recipe.tags) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map((r) => r.label);

      return {
        recipe,
        match: Math.round(100 * (0.7 * cos + 0.3 * ratio)),
        moodReasons,
        matchedIngredients: matched.map((ri) => ri.name),
      };
    })
    .sort((a, b) => b.match - a.match);
}
