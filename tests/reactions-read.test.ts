import { describe, expect, it, vi } from "vitest";
import reactions from "@/data/reactions.json";
import recipes from "@/data/recipes.json";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createReadClient: () => null }));

const { getComments, getReactionCounts } = await import("@/lib/reactions/read");

describe("reactions（Supabase 未設定）", () => {
  it("仮のスキ数とコメント数を返す", async () => {
    const counts = await getReactionCounts();
    expect(counts["fuwatoro-omurice"]).toEqual({ likes: 12, comments: 3 });
    expect(counts["gapao"]).toEqual({ likes: 9, comments: 1 });
  });

  it("コメントは新しい順", async () => {
    const list = await getComments("fuwatoro-omurice");
    expect(list.map((c) => c.id)).toEqual(["sample-3", "sample-2", "sample-1"]);
    expect(await getComments("no-such-recipe")).toEqual([]);
  });

  it("仮データのレシピ id はすべて実在する", () => {
    const ids = new Set(recipes.map((r) => r.id));
    for (const id of Object.keys(reactions.likes)) expect(ids, id).toContain(id);
    for (const c of reactions.comments) expect(ids, c.id).toContain(c.recipeId);
  });
});
