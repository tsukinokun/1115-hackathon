import { describe, expect, it } from "vitest";
import ingredientsJson from "@/data/ingredients.json";
import questionsJson from "@/data/questions.json";
import recipesJson from "@/data/recipes.json";
import { diagnose } from "@/lib/diagnose";
import type { Ingredient, PantryItem, Question, Recipe } from "@/lib/types";

const questions = questionsJson as unknown as Question[];
const recipes = recipesJson as unknown as Recipe[];
const ingredients = ingredientsJson as unknown as Ingredient[];
const pantry = (...ids: string[]): PantryItem[] =>
  ids.map((id) => ({ ingredientId: id, name: ingredients.find((i) => i.id === id)!.name }));
const top = (answers: Record<string, string[]>, items: PantryItem[], n = 3) =>
  diagnose(questions, answers, items, recipes, ingredients).slice(0, n).map((r) => r.recipe.id);

// 追加した海外料理が、気分と食材に応じてちゃんと上位に来るか
describe("海外料理を足したあとの診断", () => {
  it("冒険したい＋ピリ辛＋じっくり、鶏肉・玉ねぎ・トマト缶 → チキンカレー", () => {
    expect(top({ adventure: ["go"], taste: ["spicy"], time: ["slow"] }, pantry("chicken", "onion", "canned_tomato"), 1)).toEqual([
      "chicken-curry",
    ]);
  });

  it("すっきり＋つめたい＋未知の味、きゅうり・ヨーグルト → ザジキ", () => {
    expect(top({ mood: ["refresh"], temp: ["cool"], adventure: ["go"] }, pantry("cucumber", "yogurt"), 1)).toEqual(["tzatziki"]);
  });

  it("ほっこり＋いつもの安心＋あまめ、卵・牛乳・食パン → 上位にパンペルデュ", () => {
    expect(top({ mood: ["cozy"], adventure: ["usual"], taste: ["sweet"] }, pantry("egg", "milk", "bread"))).toContain("pain-perdu");
  });

  it("もとの3品も引き続き選ばれる（ほっこり＋いつもの安心、卵・ごはん → オムライスが上位）", () => {
    expect(top({ mood: ["cozy"], adventure: ["usual"], taste: ["sweet"] }, pantry("egg", "rice", "chicken", "onion"))).toContain(
      "fuwatoro-omurice",
    );
  });
});

describe("「どこの国の気分？」", () => {
  it("東南アジア＋未知の味、ごはん・卵 → 上位2品はナシゴレンとガパオ", () => {
    expect(top({ cuisine: ["southeast_asia"], adventure: ["go"] }, pantry("rice", "egg"), 2)).toEqual(["nasi-goreng", "gapao"]);
  });
  it("ヨーロッパ＋あまめ、パン・卵・牛乳 → パンペルデュが1位", () => {
    expect(top({ cuisine: ["europe"], taste: ["sweet"] }, pantry("bread", "egg", "milk"), 1)).toEqual(["pain-perdu"]);
  });
});
