"use client";

import { getBrowserSupabase } from "@/lib/supabase/browser";

/** 投稿者名（by ○○）。profiles はだれでも読める RLS なので、ブラウザから直接読む */
export async function getMyProfileName(userId: string): Promise<string | null> {
  const sb = getBrowserSupabase();
  if (!sb) return null;
  const { data } = await sb.from("profiles").select("name").eq("id", userId).maybeSingle();
  return (data as { name?: string } | null)?.name ?? null;
}
