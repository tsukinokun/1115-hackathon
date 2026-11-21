"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { RedPen } from "@/app/recipes/new/_components/bits";

export type LoginState =
  | { kind: "checking" }
  | { kind: "unconfigured" }
  | { kind: "signedOut"; anonymous: boolean }
  | { kind: "signedIn"; name: string | null; email?: string; next: string | null };

type Props = {
  state: LoginState;
  busy?: boolean;
  error?: string | null;
  onLogin?: () => void;
  onLogout?: () => void;
  /** 名札を保存。失敗したらメッセージを返す */
  onSaveName?: (name: string) => Promise<string | undefined>;
};

/**
 * ログイン画面の見た目。冷蔵庫の扉に「名札」と「鍵」のマグネットが貼ってある。
 * 状態（state）だけで描き分けるので、ログイン状態の取り方（LoginView）とは分けてある。
 */
export function LoginCard({ state, busy, error, onLogin, onLogout, onSaveName }: Props) {
  const turning = busy && state.kind === "signedOut";

  return (
    <div className="fridge-door relative mx-auto min-h-[540px] rounded-[22px_26px_14px_16px] px-5 pb-8 pt-10">
      {/* 取っ手 */}
      <span aria-hidden className="absolute right-3 top-[12%] h-[30%] w-[9px] rounded-full bg-[var(--chrome)] shadow-[1px_2px_0_rgba(0,0,0,0.18)]" />

      <Key state={state.kind} turning={!!turning} />

      <AnimatePresence mode="wait">
        <motion.div
          key={state.kind}
          initial={{ opacity: 0, y: 20, rotate: 4 }}
          animate={{ opacity: 1, y: 0, rotate: state.kind === "signedIn" ? 1.5 : -1.5 }}
          exit={{ opacity: 0, y: -20, rotate: -6 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="relative mt-24"
        >
          {state.kind === "checking" && <Checking />}
          {state.kind === "unconfigured" && <Unconfigured />}
          {state.kind === "signedOut" && <SignedOut anonymous={state.anonymous} busy={!!busy} onLogin={onLogin} />}
          {state.kind === "signedIn" && <SignedIn state={state} onLogout={onLogout} onSaveName={onSaveName} busy={!!busy} />}
        </motion.div>
      </AnimatePresence>

      <div className="mt-3 pl-1">
        <RedPen message={error ?? undefined} />
      </div>
    </div>
  );
}

/** 鍵のマグネット。確認中はゆれて、ログイン中は鍵穴で回る */
function Key({ state, turning }: { state: LoginState["kind"]; turning: boolean }) {
  const signedIn = state === "signedIn";
  return (
    <motion.div
      aria-hidden
      className="absolute left-1/2 top-6 -translate-x-1/2"
      style={{ originX: 0.5, originY: 0.15 }}
      animate={
        turning
          ? { rotate: [0, 0, 90], y: [0, 6, 6] }
          : state === "checking"
            ? { rotate: [-14, 12, -14] }
            : { rotate: signedIn ? [-4, 4, -4] : [-7, 5, -7], y: 0 }
      }
      transition={turning ? { duration: 0.7, times: [0, 0.3, 1] } : { duration: state === "checking" ? 1.4 : 4, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* マグネット */}
      <span className="mx-auto block h-6 w-6 rounded-full bg-[#f2b134] shadow-[0_3px_0_rgba(0,0,0,0.25)]" />
      <svg viewBox="0 0 40 90" className="-mt-1 h-20 w-10">
        <circle cx="20" cy="16" r="12" fill="none" stroke={signedIn ? "#d4a12a" : "#9aa4ad"} strokeWidth="6" />
        <path d="M20 28 L20 82 M20 62 L30 62 M20 74 L28 74" stroke={signedIn ? "#d4a12a" : "#9aa4ad"} strokeWidth="6" strokeLinecap="round" fill="none" />
      </svg>
    </motion.div>
  );
}

function Note({ children, color = "#fff8ea", className = "" }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <div className={`relative px-5 pb-5 pt-6 shadow-[2px_6px_12px_rgba(60,40,20,0.16)] ${className}`} style={{ background: color, borderRadius: "3px 5px 18px 3px" }}>
      <span aria-hidden className="absolute -top-2.5 left-1/2 h-5 w-20 -translate-x-1/2 rotate-[-3deg] bg-white/60 shadow-sm" />
      {children}
    </div>
  );
}

function Checking() {
  return (
    <Note>
      <motion.p className="font-hand text-center text-lg text-ink/70" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.4, repeat: Infinity }}>
        冷蔵庫をたしかめてる…
      </motion.p>
    </Note>
  );
}

function Unconfigured() {
  return (
    <Note>
      <p className="font-hand text-[1.3rem] leading-snug text-ink">いまは仮保存モード</p>
      <p className="mt-2 text-[0.78rem] leading-relaxed text-ink/70">
        Supabase がつながっていないので、ログインはまだ使えません。投稿・スキ・コメントは、この端末に保存されます。
      </p>
      <button type="button" disabled className="font-hand mt-4 w-full rounded-full border-2 border-dashed border-ink/25 py-2.5 text-sm text-ink/40">
        ログインはまだ使えません
      </button>
      <Links />
    </Note>
  );
}

function SignedOut({ anonymous, busy, onLogin }: { anonymous: boolean; busy: boolean; onLogin?: () => void }) {
  return (
    <Note>
      <p className="font-hand text-[1.4rem] leading-snug text-ink">
        あなたの冷蔵庫の
        <span className="relative mx-0.5 inline-block">
          鍵
          <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 40 6" aria-hidden>
            <path d="M1 4 Q 10 1 20 3.5 T 39 2.5" stroke="var(--tomato)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
        </span>
        をつくろう
      </p>
      <ul className="font-hand mt-3 space-y-1 text-[0.85rem] text-ink/80">
        <li>・スキなレシピを、ストックしておける</li>
        <li>・どの端末からでも、自分の冷蔵庫</li>
        <li>・投稿したレシピも、ずっとあなたのもの</li>
      </ul>
      {anonymous && (
        <p className="mt-3 rounded-[4px] bg-[#d3f2b0]/70 px-2 py-1.5 text-[0.72rem] leading-relaxed text-ink/75">
          いまは名無しで使っています。これまでの投稿・スキ・コメントは、そのまま引き継がれます。
        </p>
      )}
      <motion.button
        type="button"
        onClick={onLogin}
        disabled={busy}
        className="font-hand relative mt-5 flex w-full items-center justify-center gap-2 rounded-[18px_12px_20px_10px] bg-[var(--tomato)] py-3 text-lg text-white shadow-[3px_4px_0_var(--ink)] disabled:opacity-80"
        whileHover={{ rotate: -1, y: -2 }}
        whileTap={{ x: 2, y: 3, boxShadow: "0px 1px 0 var(--ink)" }}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-bold text-[#4285f4]" aria-hidden>
          G
        </span>
        {busy ? "鍵をまわしてる…" : "Google でログイン"}
      </motion.button>
      <p className="mt-2 text-center text-[0.62rem] text-ink/45">Google の本名は表示しません。名前はあとで決められます。</p>
      <Links />
    </Note>
  );
}

function SignedIn({
  state,
  busy,
  onLogout,
  onSaveName,
}: {
  state: Extract<LoginState, { kind: "signedIn" }>;
  busy: boolean;
  onLogout?: () => void;
  onSaveName?: (name: string) => Promise<string | undefined>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(state.name ?? "");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string>();

  const save = async () => {
    if (!onSaveName) return;
    setSaving(true);
    const e = await onSaveName(draft);
    setSaving(false);
    setNameError(e);
    if (!e) setEditing(false);
  };

  return (
    <div>
      {/* 名札 */}
      <div className="relative mx-auto w-[92%] rounded-[10px] bg-white shadow-[2px_6px_12px_rgba(60,40,20,0.18)]">
        <div className="rounded-t-[10px] bg-[var(--tomato)] px-4 py-1.5 text-center text-white">
          <p className="text-[0.62rem] tracking-[0.3em]">HELLO</p>
          <p className="font-hand text-sm">この冷蔵庫の持ち主は</p>
        </div>
        <div className="px-4 pb-4 pt-3 text-center">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
              className="flex items-center gap-2"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={20}
                autoFocus
                aria-label="名札（投稿者名）"
                className="font-hand min-w-0 flex-1 border-b-2 border-ink/40 bg-transparent text-center text-2xl text-ink outline-none"
              />
              <button type="submit" disabled={saving} className="font-hand shrink-0 rounded-full bg-ink px-3 py-1 text-xs text-white disabled:opacity-50">
                {saving ? "…" : "書く"}
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="group w-full" aria-label="名札を書きかえる">
              <span className="font-hand block text-[1.8rem] leading-tight text-ink">{state.name ?? "ななしの台所"}</span>
              <span className="text-[0.62rem] text-ink/40 group-hover:text-ink/70">✎ タップで書きかえ（レシピの「by ○○」になります）</span>
            </button>
          )}
          <RedPen message={nameError} />
          {state.email && <p className="mt-1 truncate text-[0.62rem] text-ink/40">{state.email}</p>}
        </div>
        <motion.span
          aria-hidden
          className="font-hand absolute -right-4 -top-5 rounded-full border-[3px] border-[#c0392b] bg-[#fffdf6]/80 px-2 text-[#c0392b]"
          initial={{ scale: 2, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 0.9, rotate: -14 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 600, damping: 15 }}
        >
          ようこそ
        </motion.span>
      </div>

      {state.next ? (
        <p className="font-hand mt-6 text-center text-sm text-ink/70" role="status">
          もとのページに戻るね…{" "}
          <Link href={state.next} className="underline decoration-wavy decoration-[var(--tomato)] underline-offset-4">
            すぐ戻る
          </Link>
        </p>
      ) : (
        <Links />
      )}

      <p className="mt-6 text-center">
        <button type="button" onClick={onLogout} disabled={busy} className="text-[0.7rem] text-ink/50 underline underline-offset-4 hover:text-ink disabled:opacity-50">
          ログアウト
        </button>
      </p>
    </div>
  );
}

function Links() {
  return (
    <p className="font-hand mt-5 flex justify-center gap-5 text-sm">
      <Link href="/diagnosis" className="text-ink/70 underline decoration-dotted underline-offset-4 hover:text-ink">
        🧊 冷蔵庫へ
      </Link>
      <Link href="/recipes/new" className="text-ink/70 underline decoration-dotted underline-offset-4 hover:text-ink">
        レシピを貼る
      </Link>
    </p>
  );
}
