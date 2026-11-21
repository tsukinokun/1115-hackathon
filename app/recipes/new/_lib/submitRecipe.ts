import { createRecipe, updateProfileName } from "@/app/actions/posting";
import { ensureSignedIn, uploadPhoto } from "@/lib/supabase/browser";
import type { Question } from "@/lib/types";
import { toRecipeInput, type RecipeDraft, type RecipeInput } from "./draft";

/**
 * ★ 投稿の送信口。画面からはこの関数しか呼ばない。
 *
 * - Supabase が設定されていれば: 匿名ログイン → 写真をアップロード → createRecipe（Server Action）
 * - 設定されていなければ: これまでどおりブラウザの localStorage に仮保存
 */

export type SubmitResult =
  | { ok: true; id: string; mode: "local" | "backend"; input: RecipeInput }
  | { ok: false; message: string };

export const LOCAL_KEY = "kyounosuki:posted-recipes";

export async function submitRecipe(draft: RecipeDraft, questions: Question[]): Promise<SubmitResult> {
  try {
    const authorName = draft.authorName.trim() || undefined;
    const token = await ensureSignedIn(authorName);
    if (!token) return saveLocally(draft, questions); // Supabase 未設定なら仮保存のまま
    // 2回目以降の投稿で名前を変えたときも「by ○○」に反映する（失敗しても投稿は続ける）
    if (authorName) await updateProfileName(token, authorName).catch(() => undefined);

    const [cover, steps] = await Promise.all([
      draft.cover ? uploadPhoto(draft.cover.file) : undefined,
      Promise.all(draft.steps.map((s) => (s.photo ? uploadPhoto(s.photo.file) : undefined))),
    ]);
    const input = toRecipeInput(draft, questions, { cover, steps });
    const res = await createRecipe(token, input);
    return res.ok ? { ok: true, id: res.id, mode: "backend", input } : { ok: false, message: res.message };
  } catch (e) {
    console.error("[submitRecipe]", e);
    return { ok: false, message: photoErrorMessage(e) ?? "保存に失敗しました。時間をおいて試してください" };
  }
}

/** 写真のアップロードで多い失敗を、画面に出せる言葉にする */
function photoErrorMessage(e: unknown): string | undefined {
  const msg = e instanceof Error ? e.message : String(e);
  if (/exceeded the maximum|too large|payload/i.test(msg)) return "写真が大きすぎます（5MBまで）";
  if (/mime type/i.test(msg)) return "写真は jpeg / png / webp / gif にしてください";
  return undefined;
}

/** 仮保存。写真はファイルなので保存しない */
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
