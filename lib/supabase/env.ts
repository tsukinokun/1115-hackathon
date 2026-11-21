/**
 * Supabase の URL を https://xxxx.supabase.co の形にそろえる。
 * ダッシュボードの「Data API」には .../rest/v1/ 付きで表示されることがあり、
 * そのまま貼ると PGRST125 (Invalid path) になるので、パスは捨てる。
 */
export function normalizeSupabaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return new URL(raw.trim()).origin;
  } catch {
    return null;
  }
}

/** Supabase の接続情報。どちらも公開してよい値（anon キー）。無ければ null = ローカル JSON で動く */
export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return url && anonKey ? { url, anonKey } : null;
}

export const PHOTO_BUCKET = "recipe-photos";

/** 投稿写真の公開 URL の先頭。<この値><user id>/<ファイル名> になる */
export function photoUrlPrefix(url: string) {
  return `${url}/storage/v1/object/public/${PHOTO_BUCKET}/`;
}
