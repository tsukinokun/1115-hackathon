"use server";

import { updateTag } from "next/cache";
import { validateComment, validateRecipeId } from "@/lib/posting/validate";
import { REACTIONS_TAG } from "@/lib/reactions/read";
import { dbError, err, signedIn, type ActionError } from "@/lib/supabase/session";
import { COMMENT_SELECT, toComment, type CommentRow } from "@/lib/supabase/mappers";
import type { RecipeComment } from "@/lib/types";

// スキ・コメントの Server Actions。posting.ts と同じく、本人の権限で書く（RLS）。
// ブラウザからは lib/reactions/client.ts 経由で呼ぶ（Supabase 未設定なら localStorage に仮保存）。

/** スキを付ける／外す（1人1回）。結果のスキ数も返す */
export async function toggleLike(
  accessToken: string,
  recipeId: unknown,
): Promise<{ ok: true; liked: boolean; count: number } | ActionError> {
  const auth = await signedIn(accessToken);
  if ("ok" in auth) return auth;
  const id = validateRecipeId(recipeId);
  if (!id.ok) return id;

  const likes = () => auth.sb.from("recipe_likes");
  const existing = await likes().select("recipe_id").eq("recipe_id", id.value).eq("user_id", auth.userId).maybeSingle();
  if (existing.error) return dbError(existing.error, "reactions");

  let liked: boolean;
  if (existing.data) {
    const { error } = await likes().delete().eq("recipe_id", id.value).eq("user_id", auth.userId);
    if (error) return dbError(error, "reactions");
    liked = false;
  } else {
    const { error } = await likes().insert({ recipe_id: id.value, user_id: auth.userId });
    // 23505 = 連打などでもう入っていた。付いている状態なので成功とみなす
    if (error && error.code !== "23505") {
      return error.code === "23503" ? err("not_found", "レシピが見つかりません") : dbError(error, "reactions");
    }
    liked = true;
  }

  const { count, error } = await likes().select("recipe_id", { count: "exact", head: true }).eq("recipe_id", id.value);
  if (error) return dbError(error, "reactions");
  updateTag(REACTIONS_TAG);
  return { ok: true, liked, count: count ?? 0 };
}

/** コメントする。写真は先に uploadPhoto で上げた自分の URL だけ指定できる */
export async function addComment(
  accessToken: string,
  input: unknown,
): Promise<{ ok: true; comment: RecipeComment } | ActionError> {
  const auth = await signedIn(accessToken);
  if ("ok" in auth) return auth;
  const v = validateComment(input, auth.isOwnPhoto);
  if (!v.ok) return v;

  const { data, error } = await auth.sb
    .from("recipe_comments")
    .insert({ recipe_id: v.value.recipeId, user_id: auth.userId, body: v.value.body, photo_url: v.value.photoUrl ?? null })
    .select(COMMENT_SELECT)
    .single();
  if (error) return error.code === "23503" ? err("not_found", "レシピが見つかりません") : dbError(error, "reactions");
  updateTag(REACTIONS_TAG);
  return { ok: true, comment: toComment(data as unknown as CommentRow) };
}

/** 自分のコメントを消す */
export async function deleteComment(accessToken: string, commentId: unknown): Promise<{ ok: true } | ActionError> {
  const auth = await signedIn(accessToken);
  if ("ok" in auth) return auth;
  const id = typeof commentId === "string" && /^\d{1,18}$/.test(commentId) ? commentId : null;
  if (!id) return { ok: false, error: "invalid_input", message: "コメントの指定が正しくありません" };

  const { data, error } = await auth.sb.from("recipe_comments").delete().eq("id", id).eq("user_id", auth.userId).select("id");
  if (error) return dbError(error, "reactions");
  if (!data?.length) return err("not_found", "コメントが見つかりません");
  updateTag(REACTIONS_TAG);
  return { ok: true };
}
