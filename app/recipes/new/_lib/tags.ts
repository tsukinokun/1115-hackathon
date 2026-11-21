import { countryTags } from "@/lib/countries";
import type { Question, TagWeights } from "@/lib/types";
import { LIMITS } from "./limits";

/** questionId -> 選んだ optionId（投稿では1つの質問に複数選べる） */
export type MoodPicks = Record<string, string[]>;

/**
 * 投稿者が選んだ「気分」の選択肢と「国」から、診断用のタグを作る。
 * 診断（lib/diagnose.ts）は回答のタグとレシピのタグの近さで選ぶので、
 * 気分は質問の選択肢のタグを、国は lib/countries.ts の country_ / region_ タグをそのまま使う。
 */
export function buildTags(questions: Question[], picks: MoodPicks, countries: string[] = []): TagWeights {
  const tags: TagWeights = { ...countryTags(countries) };
  for (const q of questions) {
    for (const o of q.options) {
      if (!picks[q.id]?.includes(o.id)) continue;
      for (const [k, w] of Object.entries(o.tags)) tags[k] = (tags[k] ?? 0) + w;
    }
  }
  // 重みは 0〜5 の整数、数は上位 tagCount 個まで（バックエンドの制約）
  return Object.fromEntries(
    Object.entries(tags)
      .map(([k, w]) => [k, Math.min(LIMITS.tagWeight.max, Math.max(LIMITS.tagWeight.min, Math.round(w)))] as const)
      .filter(([, w]) => w > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, LIMITS.tagCount),
  );
}
