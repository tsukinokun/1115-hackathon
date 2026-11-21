import ingredientsJson from "@/data/ingredients.json";
import questionsJson from "@/data/questions.json";
import recipesJson from "@/data/recipes.json";
import type { Ingredient, Question, Recipe } from "./types";

/**
 * データ取得の差し替え口。いまはローカル JSON を返す。
 * Supabase に接続するときは、各関数の中身だけを置き換える（supabase/schema.sql 参照）。
 *
 *   getQuestions   … questions + question_options
 *   getRecipes     … recipes + recipe_ingredients + recipe_steps(order by position) + recipe_photos + profiles
 *   getIngredients … ingredients
 */
export async function getQuestions(): Promise<Question[]> {
  return questionsJson as unknown as Question[];
}

export async function getRecipes(): Promise<Recipe[]> {
  return recipesJson as unknown as Recipe[];
}

export async function getIngredients(): Promise<Ingredient[]> {
  return ingredientsJson as unknown as Ingredient[];
}
