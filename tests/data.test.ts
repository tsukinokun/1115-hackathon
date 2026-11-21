import { describe, expect, it } from "vitest";
import ingredients from "@/data/ingredients.json";
import questions from "@/data/questions.json";
import recipes from "@/data/recipes.json";
import type { TagWeights } from "@/lib/types";
import { countriesFromTags, COUNTRIES, countryTag, REGION_LABELS, regionTag, type Region } from "@/lib/countries";

// data/*.json を編集したときに壊れていないかのチェック
describe("data/*.json の整合性", () => {
  const ingIds = new Set(ingredients.map((i) => i.id));
  const tagVocabulary = new Set([
    ...questions.flatMap((q) => q.options.flatMap((o) => Object.keys(o.tags))),
    // 国・地域のタグ（lib/countries.ts）。診断では地域タグで聞くので、国タグは表示用
    ...COUNTRIES.map((c) => countryTag(c.code)),
    ...Object.keys(REGION_LABELS).map((r) => regionTag(r as Region)),
  ]);

  it("id が重複していない", () => {
    expect(ingIds.size).toBe(ingredients.length);
    expect(new Set(ingredients.map((i) => i.name)).size).toBe(ingredients.length); // DB で name は unique
    expect(new Set(recipes.map((r) => r.id)).size).toBe(recipes.length);
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
  });

  it("レシピの ingredientId はすべて食材マスタにある", () => {
    for (const r of recipes)
      for (const i of r.ingredients as { ingredientId?: string }[])
        if (i.ingredientId) expect(ingIds, `${r.id} → ${i.ingredientId}`).toContain(i.ingredientId);
  });

  it("レシピのタグは質問か国・地域のタグだけ（診断に効かないタグを作らない）", () => {
    for (const r of recipes)
      for (const t of Object.keys(r.tags)) expect(tagVocabulary, `${r.id} → ${t}`).toContain(t);
  });

  it("どのレシピにも国が1つ以上あり、その国の地域タグも付いている", () => {
    for (const r of recipes) {
      const countries = countriesFromTags(r.tags as unknown as TagWeights);
      expect(countries.length, r.id).toBeGreaterThan(0);
      for (const c of countries) expect(r.tags, r.id).toHaveProperty(regionTag(c.region));
    }
  });

  it("どのレシピにも材料・手順・タグがある", () => {
    for (const r of recipes) {
      expect(r.ingredients.length, r.id).toBeGreaterThan(0);
      expect(r.steps.length, r.id).toBeGreaterThan(0);
      expect(Object.keys(r.tags).length, r.id).toBeGreaterThan(0);
    }
  });

  it("$seed$ を含まない（seed.sql の生成で使う区切り文字）", () => {
    expect(JSON.stringify([ingredients, recipes, questions])).not.toContain("$seed$");
  });
});
