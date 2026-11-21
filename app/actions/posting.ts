"use server";

import { updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/repository";
import { getSupabaseEnv, photoUrlPrefix } from "@/lib/supabase/env";
import { createUserClient } from "@/lib/supabase/server";
import {
  validateIngredient,
  validatePhoto,
  validateProfileName,
  validateRecipe,
  type Invalid,
} from "@/lib/posting/validate";

// 投稿系の Server Actions。クライアントからはこう呼ぶ:
//
//   const token = await ensureSignedIn();          // lib/supabase/browser.ts
//   const res = await createRecipe(token, { ... });
//   if (!res.ok) alert(res.message);
//
// 書き込みはユーザー本人の権限で行うので、他人の名義では書けない（RLS）。
// 成功したら updateTag でキャッシュを捨てるので、次の表示から新しいデータが出る。

export type ActionError = Invalid | { ok: false; error: ErrorCode; message: string };
type ErrorCode =
  | "supabase_not_configured"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "invalid_reference"
  | "server_error";

const err = (error: ErrorCode, message: string): ActionError => ({ ok: false, error, message });

/** トークンからユーザーを確かめて、本人として書き込むクライアントを返す */
async function signedIn(accessToken: unknown) {
  const env = getSupabaseEnv();
  if (!env) return err("supabase_not_configured", "Supabase が設定されていません");
  if (typeof accessToken !== "string" || !accessToken) return err("unauthorized", "ログインしてください");
  const sb = createUserClient(accessToken)!;
  const { data, error } = await sb.auth.getUser(accessToken);
  if (error || !data.user) return err("unauthorized", "ログインし直してください");
  const prefix = photoUrlPrefix(env.url) + `${data.user.id}/`;
  // 写真は「自分がアップロードしたもの」だけ指定できる
  const isOwnPhoto = (url: string) => url.startsWith(prefix) && !url.slice(prefix.length).includes("..");
  return { sb, userId: data.user.id, isOwnPhoto };
}

function dbError(e: { code?: string; message?: string }): ActionError {
  switch (e.code) {
    case "42501": // RLS / 権限
      return err("forbidden", "この操作はできません");
    case "23503": // 外部キー
      return err("invalid_reference", "存在しない食材やレシピが指定されています");
    default:
      console.error("[posting] database error", e);
      return err("server_error", "保存に失敗しました。時間をおいて試してください");
  }
}

/** レシピを投稿する */
export async function createRecipe(accessToken: string, input: unknown): Promise<{ ok: true; id: string } | ActionError> {
  const auth = await signedIn(accessToken);
  if ("ok" in auth) return auth;
  const v = validateRecipe(input, auth.isOwnPhoto);
  if (!v.ok) return v;
  const r = v.value;
  const { data, error } = await auth.sb.rpc("create_recipe", {
    p_title: r.title,
    p_catch: r.catch ?? "",
    p_description: r.description ?? null,
    p_minutes: r.minutes,
    p_servings: r.servings,
    p_tags: r.tags,
    p_cover_image: r.coverImage ?? null,
    p_ingredients: r.ingredients,
    p_steps: r.steps,
  });
  if (error) return dbError(error);
  updateTag(CACHE_TAGS.recipes);
  return { ok: true, id: data as string };
}

/** つくれぽ（完成写真・途中経過）をレシピに追加する。先に uploadPhoto で URL を作っておく */
export async function addRecipePhoto(accessToken: string, input: unknown): Promise<{ ok: true } | ActionError> {
  const auth = await signedIn(accessToken);
  if ("ok" in auth) return auth;
  const v = validatePhoto(input, auth.isOwnPhoto);
  if (!v.ok) return v;
  const p = v.value;
  const { error } = await auth.sb.from("recipe_photos").insert({
    recipe_id: p.recipeId,
    url: p.url,
    caption: p.caption ?? null,
    kind: p.kind,
    posted_by: auth.userId,
  });
  if (error) return error.code === "23503" ? err("not_found", "レシピが見つかりません") : dbError(error);
  updateTag(CACHE_TAGS.recipes);
  return { ok: true };
}

/** 食材マスタに追加する。同じ名前がもうあれば、その食材の id を返す */
export async function addIngredient(
  accessToken: string,
  input: unknown,
): Promise<{ ok: true; id: string; created: boolean } | ActionError> {
  const auth = await signedIn(accessToken);
  if ("ok" in auth) return auth;
  const v = validateIngredient(input);
  if (!v.ok) return v;
  const i = v.value;
  const { data, error } = await auth.sb
    .from("ingredients")
    .insert({ name: i.name, reading: i.reading ?? null, aliases: i.aliases ?? [], category: i.category, created_by: auth.userId })
    .select("id")
    .single();
  if (error?.code === "23505") {
    const existing = await auth.sb.from("ingredients").select("id").eq("name", i.name).single();
    if (existing.data) return { ok: true, id: existing.data.id as string, created: false };
  }
  if (error) return dbError(error);
  updateTag(CACHE_TAGS.ingredients);
  return { ok: true, id: data.id as string, created: true };
}

/** 投稿者名（by ○○）を変える */
export async function updateProfileName(accessToken: string, name: unknown): Promise<{ ok: true } | ActionError> {
  const auth = await signedIn(accessToken);
  if ("ok" in auth) return auth;
  const v = validateProfileName(name);
  if (!v.ok) return v;
  const { error } = await auth.sb.from("profiles").update({ name: v.value }).eq("id", auth.userId);
  if (error) return dbError(error);
  updateTag(CACHE_TAGS.recipes);
  return { ok: true };
}
