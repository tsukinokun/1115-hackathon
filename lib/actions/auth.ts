// Server Actions 共通: 呼び出したユーザーの確認とエラーの形。
// ここは "use server" ファイルではない（ブラウザから直接呼ばれないように）。
import type { Invalid } from "../posting/validate";
import { getSupabaseEnv, photoUrlPrefix } from "../supabase/env";
import { createUserClient } from "../supabase/server";

export type ErrorCode =
  | "supabase_not_configured"
  | "unauthorized"
  | "login_required"
  | "forbidden"
  | "not_found"
  | "invalid_reference"
  | "server_error";

export type ActionError = Invalid | { ok: false; error: ErrorCode; message: string };

export const err = (error: ErrorCode, message: string): ActionError => ({ ok: false, error, message });

/** トークンからユーザーを確かめて、本人として書き込むクライアントを返す */
export async function signedIn(accessToken: unknown) {
  const env = getSupabaseEnv();
  if (!env) return err("supabase_not_configured", "Supabase が設定されていません");
  if (typeof accessToken !== "string" || !accessToken) return err("unauthorized", "ログインしてください");
  const sb = createUserClient(accessToken)!;
  const { data, error } = await sb.auth.getUser(accessToken);
  if (error || !data.user) return err("unauthorized", "ログインし直してください");
  const prefix = photoUrlPrefix(env.url) + `${data.user.id}/`;
  return {
    sb,
    userId: data.user.id,
    /** 匿名ログインのままか（Google などにまだ切り替えていない） */
    isAnonymous: data.user.is_anonymous === true,
    /** 写真は「自分がアップロードしたもの」だけ指定できる */
    isOwnPhoto: (url: string) => url.startsWith(prefix) && !url.slice(prefix.length).includes(".."),
  };
}

export function dbError(e: { code?: string; message?: string }): ActionError {
  switch (e.code) {
    case "42501": // RLS / 権限
      return err("forbidden", "この操作はできません");
    case "23503": // 外部キー
      return err("invalid_reference", "存在しない食材やレシピが指定されています");
    default:
      console.error("[actions] database error", e);
      return err("server_error", "保存に失敗しました。時間をおいて試してください");
  }
}
