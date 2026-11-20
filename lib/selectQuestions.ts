import { hash } from "./jitter";
import type { Question } from "./types";

/**
 * 質問がいくら投稿されても、扉に貼るのは max 枚まで。
 * priority の高い順。同じ priority の中は日替わりで入れ替わる。
 * サーバー側で一度だけ呼んで、結果をクライアントへ渡す（日付のズレで hydration が崩れないように）。
 */
export function selectQuestions(all: Question[], seed: string, max = 7) {
  return [...all]
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || hash(seed + a.id) - hash(seed + b.id))
    .slice(0, max);
}
