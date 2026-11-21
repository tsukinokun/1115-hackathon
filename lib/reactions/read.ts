import { cacheLife, cacheTag } from "next/cache";
import reactionsJson from "@/data/reactions.json";
import { COMMENT_SELECT, toComment, type CommentRow } from "@/lib/supabase/mappers";
import { createReadClient } from "@/lib/supabase/server";
import type { ReactionCounts, RecipeComment } from "@/lib/types";

/**
 * スキ数・コメントの読み込み（サーバー側）。
 * - Supabase があれば recipe_reaction_counts / recipe_comments から
 * - 無いとき、またはエラーのときは data/reactions.json（仮のデータ）
 * 数分キャッシュし、Server Action（app/actions/reactions.ts）が updateTag で捨てる。
 */
export const REACTIONS_TAG = "reactions";

const local = reactionsJson as unknown as {
  likes: Record<string, number>;
  comments: RecipeComment[];
};

function localCounts(): ReactionCounts {
  const counts: ReactionCounts = {};
  for (const [id, likes] of Object.entries(local.likes)) counts[id] = { likes, comments: 0 };
  for (const c of local.comments) {
    counts[c.recipeId] ??= { likes: 0, comments: 0 };
    counts[c.recipeId].comments += 1;
  }
  return counts;
}

export async function getReactionCounts(): Promise<ReactionCounts> {
  "use cache";
  cacheTag(REACTIONS_TAG);
  cacheLife("minutes");
  const sb = createReadClient();
  if (!sb) return localCounts();
  const { data, error } = await sb.from("recipe_reaction_counts").select("recipe_id, likes, comments");
  if (error || !data) {
    console.error("[reactions] 件数の取得に失敗したので仮のデータを使います", error);
    return localCounts();
  }
  return Object.fromEntries(
    (data as { recipe_id: string; likes: number; comments: number }[]).map((r) => [r.recipe_id, { likes: r.likes, comments: r.comments }]),
  );
}

/** 新しい順 */
export async function getComments(recipeId: string): Promise<RecipeComment[]> {
  "use cache";
  cacheTag(REACTIONS_TAG);
  cacheLife("minutes");
  const fallback = local.comments
    .filter((c) => c.recipeId === recipeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sb = createReadClient();
  if (!sb) return fallback;
  const { data, error } = await sb
    .from("recipe_comments")
    .select(COMMENT_SELECT)
    .eq("recipe_id", recipeId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) {
    console.error("[reactions] コメントの取得に失敗したので仮のデータを使います", error);
    return fallback;
  }
  return (data as unknown as CommentRow[]).map(toComment);
}
