import { cacheLife, cacheTag } from "next/cache";
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
} from "./supabase/mappers";
import { createReadClient } from "./supabase/server";
import type { Ingredient, Question, Recipe } from "./types";

/**
 * データ取得の差し替え口。
 * - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY があれば Supabase から読む
 * - 無いとき、または Supabase がエラーを返したときはローカル JSON（デモが止まらないように）
 *
 * 数分キャッシュする。投稿したときは Server Action が updateTag で即座に捨てる（app/actions/posting.ts）。
 */
export const CACHE_TAGS = {
  recipes: "recipes",
  ingredients: "ingredients",
  questions: "questions",
} as const;

const local = {
  questions: questionsJson as unknown as Question[],
  recipes: recipesJson as unknown as Recipe[],
  ingredients: ingredientsJson as unknown as Ingredient[],
};

async function load<Row, T>(
  table: string,
  select: string,
  order: string,
  map: (row: Row) => T,
  fallback: T[],
): Promise<T[]> {
  const sb = createReadClient();
  if (!sb) return fallback;
  const { data, error } = await sb.from(table).select(select).order(order, { ascending: true });
  if (error || !data) {
    console.error(`[repository] ${table} の取得に失敗したのでローカル JSON を使います`, error);
    return fallback;
  }
  return (data as unknown as Row[]).map(map);
}

export async function getQuestions(): Promise<Question[]> {
  "use cache";
  cacheTag(CACHE_TAGS.questions);
  cacheLife("minutes");
  return load<QuestionRow, Question>("questions", QUESTION_SELECT, "created_at", toQuestion, local.questions);
}

export async function getRecipes(): Promise<Recipe[]> {
  "use cache";
  cacheTag(CACHE_TAGS.recipes);
  cacheLife("minutes");
  return load<RecipeRow, Recipe>("recipes", RECIPE_SELECT, "created_at", toRecipe, local.recipes);
}

export async function getIngredients(): Promise<Ingredient[]> {
  "use cache";
  cacheTag(CACHE_TAGS.ingredients);
  cacheLife("minutes");
  return load<IngredientRow, Ingredient>("ingredients", INGREDIENT_SELECT, "created_at", toIngredient, local.ingredients);
}
