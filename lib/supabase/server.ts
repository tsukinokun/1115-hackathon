import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

const options = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** 読み取り用（だれでも読める RLS なので anon で十分） */
export function createReadClient() {
  const env = getSupabaseEnv();
  return env ? createClient(env.url, env.anonKey, options) : null;
}

/** ログインユーザーとして書き込む。RLS が auth.uid() で本人チェックする */
export function createUserClient(accessToken: string) {
  const env = getSupabaseEnv();
  if (!env) return null;
  return createClient(env.url, env.anonKey, {
    ...options,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
