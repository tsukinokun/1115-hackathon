/** Supabase の接続情報。どちらも公開してよい値（anon キー）。無ければ null = ローカル JSON で動く */
export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url: url.replace(/\/+$/, ""), anonKey } : null;
}

export const PHOTO_BUCKET = "recipe-photos";

/** 投稿写真の公開 URL の先頭。<この値><user id>/<ファイル名> になる */
export function photoUrlPrefix(url: string) {
  return `${url}/storage/v1/object/public/${PHOTO_BUCKET}/`;
}
