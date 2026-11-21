"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv, PHOTO_BUCKET } from "./env";

// ブラウザ側で使うもの: 匿名ログインと写真アップロードだけ。
// 書き込み本体は Server Actions（app/actions/posting.ts）に accessToken を渡して行う。

let client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  if (client) return client;
  const env = getSupabaseEnv();
  if (!env) return null;
  client = createClient(env.url, env.anonKey);
  return client;
}

/**
 * ログインしていなければ匿名ログインして、アクセストークンを返す。
 * 初回だけ name が profiles.name になる（あとから updateProfileName で変えられる）。
 * Supabase 未設定なら null。
 */
export async function ensureSignedIn(name?: string): Promise<string | null> {
  const sb = getBrowserSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.access_token;
  // name ではなく display_name に入れる（Google ログインの name は本名なので、投稿者名には使わない）
  const { data: signed, error } = await sb.auth.signInAnonymously({
    options: { data: name ? { display_name: name } : {} },
  });
  if (error || !signed.session) throw error ?? new Error("anonymous sign-in failed");
  return signed.session.access_token;
}

/** 写真を Storage にアップロードして公開 URL を返す。5MB まで、jpeg/png/webp/gif */
export async function uploadPhoto(file: File): Promise<string> {
  const sb = getBrowserSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  await ensureSignedIn();
  const { data: user } = await sb.auth.getUser();
  if (!user.user) throw new Error("not signed in");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${user.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/* ---------- Google ログイン ---------- */

/** ログイン後に戻ってくる URL（いまのページ）。Supabase の Redirect URLs に登録が必要 */
const currentUrl = () => window.location.origin + window.location.pathname + window.location.search;

/**
 * Google でログインする（Google の画面に移動し、終わったら今のページに戻ってくる）。
 * 匿名ログイン中なら、同じアカウントのまま Google に切り替える（それまでの投稿が残る）。
 * Supabase の Authentication で "Allow manual linking" を ON にしておくこと。
 */
export async function signInWithGoogle(): Promise<void> {
  const sb = getBrowserSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data } = await sb.auth.getSession();
  const options = { redirectTo: currentUrl() };
  const { error } = data.session?.user.is_anonymous
    ? await sb.auth.linkIdentity({ provider: "google", options })
    : await sb.auth.signInWithOAuth({ provider: "google", options });
  if (error) throw error;
}

/** ログアウト。次に投稿するときは、また新しい匿名ユーザーになる */
export async function signOut(): Promise<void> {
  await getBrowserSupabase()?.auth.signOut();
}
