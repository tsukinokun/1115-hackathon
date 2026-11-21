"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "./browser";
import { getSupabaseEnv } from "./env";

/**
 * ログイン状態を返す React フック。ログインボタンやストックの画面で使う。
 *
 *   const { session, ready } = useAuth();
 *   if (!ready) return null;                         // 読み込み中
 *   if (!session || session.isAnonymous) → 「Google でログイン」ボタン（signInWithGoogle）
 *   else → session.accessToken を Server Action に渡す
 *
 * Google から戻ってきたときの処理（URL のトークンを読む）もここで行うので、
 * ログイン後に戻ってくるページでは必ずこのフックを使うこと。
 */

export type AuthSession = {
  accessToken: string;
  userId: string;
  /** 匿名ログインのまま（Google に切り替えていない） */
  isAnonymous: boolean;
  email?: string;
};

const toAuthSession = (s: Session | null): AuthSession | null =>
  s ? { accessToken: s.access_token, userId: s.user.id, isAnonymous: s.user.is_anonymous === true, email: s.user.email } : null;

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  // Supabase 未設定なら最初から ready（session は null のまま）
  const [ready, setReady] = useState(() => getSupabaseEnv() === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    let alive = true;

    (async () => {
      // URL に Google からの戻り値があれば、ここでセッションになる
      const { error: initError } = await sb.auth.initialize();
      const code = (initError as { details?: { code?: string } } | null)?.details?.code;
      if (code === "identity_already_exists") {
        // その Google アカウントは別のユーザーとして登録済み → そちらに切り替える
        // （匿名のときの投稿は、匿名ユーザーのものとして残る）
        await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + window.location.pathname } });
        return;
      }
      if (initError && alive) setError("ログインに失敗しました。もう一度試してください");
      // URL に残ったログイン情報（#access_token=...）を消す
      if (window.location.hash.includes("access_token") || window.location.hash.includes("error")) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      const { data } = await sb.auth.getSession();
      if (alive) {
        setSession(toAuthSession(data.session));
        setReady(true);
      }
    })();

    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => {
      if (alive) setSession(toAuthSession(s));
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, ready, error };
}
