"use client";

import { MotionConfig } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Kitchen } from "@/app/_components/Kitchen";
import { updateProfileName } from "@/app/actions/posting";
import { safeNext } from "@/lib/auth/next";
import { getMyProfileName } from "@/lib/auth/profile";
import { signInWithGoogle, signOut } from "@/lib/supabase/browser";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useAuth } from "@/lib/supabase/useAuth";
import { LoginCard, type LoginState } from "./LoginCard";

/**
 * ログイン画面。Google でログインする（バックエンドの signInWithGoogle）。
 * Google から戻ってくるのもこのページなので、useAuth() がその処理をする。
 * ?next=/recipes/xxx があれば、ログインできたらそこへ戻す。
 */
export function LoginView() {
  const router = useRouter();
  const { session, ready, error: authError } = useAuth();
  const [next, setNext] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ?next= はクライアントで読む（useSearchParams を使うと Suspense が要るため）
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- location はクライアントでしか読めない
    setNext(safeNext(new URLSearchParams(window.location.search).get("next")));
  }, []);

  const signedIn = !!session && !session.isAnonymous;

  // 名札（投稿者名）を読む
  useEffect(() => {
    if (!signedIn || !session) return;
    let alive = true;
    getMyProfileName(session.userId).then((n) => alive && setName(n));
    return () => {
      alive = false;
    };
  }, [signedIn, session]);

  // ログインできたら、もとのページへ
  useEffect(() => {
    if (!signedIn || !next) return;
    const t = setTimeout(() => router.replace(next), 1600);
    return () => clearTimeout(t);
  }, [signedIn, next, router]);

  const state: LoginState = !getSupabaseEnv()
    ? { kind: "unconfigured" }
    : !ready
      ? { kind: "checking" }
      : signedIn
        ? { kind: "signedIn", name, email: session!.email, next }
        : { kind: "signedOut", anonymous: !!session?.isAnonymous };

  const login = async () => {
    setError(null);
    setBusy(true);
    try {
      // 鍵が回る演出を見せてから Google へ
      await new Promise((r) => setTimeout(r, 650));
      await signInWithGoogle(); // ここで Google の画面へ移動する
    } catch (e) {
      console.error("[login]", e);
      setError("Google につながりませんでした。少し待ってからもう一度どうぞ");
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    await signOut().catch(() => undefined);
    setName(null);
    setBusy(false);
  };

  const saveName = async (raw: string) => {
    if (!session) return "ログインし直してください";
    const res = await updateProfileName(session.accessToken, raw);
    if (!res.ok) return res.message;
    setName(raw.trim());
    return undefined;
  };

  return (
    <MotionConfig reducedMotion="user">
      <Kitchen>
        <main className="relative mx-auto w-full max-w-[420px] px-4 pb-16 pt-5">
          <header className="mb-5 flex items-end justify-between">
            <Link href={next ?? "/diagnosis"} className="font-hand text-sm text-ink/60 hover:text-ink">
              ← もどる
            </Link>
            <h1 className="font-hand -rotate-2 text-[1.25rem] text-ink">ログイン</h1>
          </header>
          <LoginCard state={state} busy={busy} error={error ?? authError} onLogin={login} onLogout={logout} onSaveName={saveName} />
        </main>
      </Kitchen>
    </MotionConfig>
  );
}
