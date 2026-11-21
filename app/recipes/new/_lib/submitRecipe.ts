import type { Question } from "@/lib/types";
import { toRecipeInput, type RecipeDraft, type RecipeInput } from "./draft";

/**
 * ★ 投稿の送信口。画面からはこの関数しか呼ばない。
 *
 * いまはバックエンドが未マージなので、ブラウザの localStorage に仮保存する。
 * バックエンド（app/actions/posting.ts, lib/supabase/browser.ts）がマージされたら、
 * submitRecipe の中身を次のように差し替えるだけでよい。画面側は変更不要。
 *
 *   import { createRecipe } from "@/app/actions/posting";
 *   import { ensureSignedIn, uploadPhoto } from "@/lib/supabase/browser";
 *
 *   const token = await ensureSignedIn(draft.authorName || undefined);
 *   if (!token) return saveLocally(draft, questions);          // Supabase 未設定なら仮保存のまま
 *   const cover = draft.cover ? await uploadPhoto(draft.cover.file) : undefined;
 *   const steps = await Promise.all(draft.steps.map((s) => (s.photo ? uploadPhoto(s.photo.file) : undefined)));
 *   const res = await createRecipe(token, toRecipeInput(draft, questions, { cover, steps }));
 *   return res.ok ? { ok: true, id: res.id, mode: "backend" } : { ok: false, message: res.message };
 *
 * （uploadPhoto は失敗すると throw するので、try/catch で message に直す）
 */

export type SubmitResult =
  | { ok: true; id: string; mode: "local" | "backend"; input: RecipeInput }
  | { ok: false; message: string };

export const LOCAL_KEY = "kyounosuki:posted-recipes";

export async function submitRecipe(draft: RecipeDraft, questions: Question[]): Promise<SubmitResult> {
  try {
    return saveLocally(draft, questions);
  } catch {
    return { ok: false, message: "保存に失敗しました。時間をおいて試してください" };
  }
}

/** 仮保存。写真はファイルなので保存しない（バックエンド接続後はアップロードされる） */
function saveLocally(draft: RecipeDraft, questions: Question[]): SubmitResult {
  const input = toRecipeInput(draft, questions);
  const id = `local-${Date.now().toString(36)}`;
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as unknown[];
    list.push({ id, authorName: draft.authorName.trim() || undefined, postedAt: new Date().toISOString(), input });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    // プライベートモード等で保存できなくても、投稿の流れ自体は止めない
  }
  return { ok: true, id, mode: "local", input };
}
