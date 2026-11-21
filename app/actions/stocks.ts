"use server";

import { dbError, err, signedIn, type ActionError } from "@/lib/supabase/session";
import { RECIPE_SELECT, toRecipe, type RecipeRow } from "@/lib/supabase/mappers";
import type { Recipe } from "@/lib/types";

// ストック（あとで作りたいレシピ）の Server Actions。Google などでログインした人だけ使える。
// クライアントからはこう呼ぶ:
//
//   const { session } = useAuth();                  // lib/supabase/useAuth.ts
//   if (session.isAnonymous) → 「Google でログインしてね」を出す
//   const res = await addStock(session.accessToken, recipe.id);
//
// 匿名ログインのままだと { ok: false, error: "login_required" } が返る。

export type StockedRecipe = { recipe: Recipe; stockedAt: string };

const loginRequired = () => err("login_required", "ストックするには Google でログインしてください");
const isRecipeId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 64;

/** ストックに追加する（もう入っていても ok） */
export async function addStock(accessToken: string, recipeId: unknown): Promise<{ ok: true } | ActionError> {
  const auth = await signedIn(accessToken);
  if ("ok" in auth) return auth;
  if (auth.isAnonymous) return loginRequired();
  if (!isRecipeId(recipeId)) return err("not_found", "レシピが見つかりません");
  const { error } = await auth.sb.from("stocks").insert({ user_id: auth.userId, recipe_id: recipeId });
  if (!error || error.code === "23505") return { ok: true }; // 23505 = もうストック済み
  return error.code === "23503" ? err("not_found", "レシピが見つかりません") : dbError(error, "stocks");
}

/** ストックから外す（入っていなくても ok） */
export async function removeStock(accessToken: string, recipeId: unknown): Promise<{ ok: true } | ActionError> {
  const auth = await signedIn(accessToken);
  if ("ok" in auth) return auth;
  if (!isRecipeId(recipeId)) return { ok: true };
  const { error } = await auth.sb.from("stocks").delete().eq("user_id", auth.userId).eq("recipe_id", recipeId);
  return error ? dbError(error, "stocks") : { ok: true };
}

/** 自分のストック一覧（新しい順）。匿名ユーザーは空 */
export async function listStocks(accessToken: string): Promise<{ ok: true; stocks: StockedRecipe[] } | ActionError> {
  const auth = await signedIn(accessToken);
  if ("ok" in auth) return auth;
  if (auth.isAnonymous) return { ok: true, stocks: [] };
  const { data, error } = await auth.sb
    .from("stocks")
    .select(`created_at, recipe:recipes(${RECIPE_SELECT})`)
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });
  if (error) return dbError(error, "stocks");
  const rows = (data ?? []) as unknown as { created_at: string; recipe: RecipeRow | null }[];
  return {
    ok: true,
    stocks: rows.filter((r) => r.recipe).map((r) => ({ recipe: toRecipe(r.recipe!), stockedAt: r.created_at })),
  };
}
