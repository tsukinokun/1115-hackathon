import type { Invalid } from "@/lib/posting/validate";
import { getSupabaseEnv, photoUrlPrefix } from "./env";
import { createUserClient } from "./server";

// Server Actions（app/actions/*.ts）で共通に使う「本人確認」と「エラーの言い換え」。
// "use server" のファイルから export すると外から呼べる口になってしまうので、普通のモジュールに置く。

export type ActionError = Invalid | { ok: false; error: ErrorCode; message: string };
export type ErrorCode =
  | "supabase_not_configured"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "invalid_reference"
  | "server_error";

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
  // 写真は「自分がアップロードしたもの」だけ指定できる
  const isOwnPhoto = (url: string) => url.startsWith(prefix) && !url.slice(prefix.length).includes("..");
  return { sb, userId: data.user.id, isOwnPhoto };
}

export function dbError(e: { code?: string; message?: string }, where = "posting"): ActionError {
  switch (e.code) {
    case "42501": // RLS / 権限
      return err("forbidden", "この操作はできません");
    case "23503": // 外部キー
      return err("invalid_reference", "存在しない食材やレシピが指定されています");
    default:
      console.error(`[${where}] database error`, e);
      return err("server_error", "保存に失敗しました。時間をおいて試してください");
  }
}
