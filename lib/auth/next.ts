/**
 * ログイン後に戻る先（?next=）を、このサイトの中のパスだけに絞る。
 * 「//evil.com」や「https://...」を通すと、ログイン画面を踏み台に外のサイトへ飛ばせてしまう（オープンリダイレクト）。
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let v: string;
  try {
    v = decodeURIComponent(raw).trim();
  } catch {
    return null;
  }
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return null;
  // 制御文字やバックスラッシュは、ブラウザが「//」と同じに解釈することがあるので弾く
  if (/[\\\u0000-\u001f]/.test(v)) return null;
  if (v === "/login" || v.startsWith("/login?") || v.startsWith("/login#")) return null;
  return v;
}

/** /login?next=<戻り先> を作る */
export function loginHref(next?: string | null): string {
  const n = safeNext(next ?? null);
  return n ? `/login?next=${encodeURIComponent(n)}` : "/login";
}
