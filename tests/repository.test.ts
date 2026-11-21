import { afterEach, describe, expect, it, vi } from "vitest";
import recipesJson from "@/data/recipes.json";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));

const select = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createReadClient: () =>
    process.env.NEXT_PUBLIC_SUPABASE_URL ? { from: () => ({ select: () => ({ order: select }) }) } : null,
}));

const { getRecipes, getQuestions, getIngredients } = await import("@/lib/repository");

afterEach(() => {
  vi.unstubAllEnvs();
  select.mockReset();
});

describe("repository", () => {
  it("Supabase 未設定ならローカル JSON", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(await getRecipes()).toEqual(recipesJson);
    expect((await getQuestions()).length).toBeGreaterThan(0);
    expect((await getIngredients()).length).toBeGreaterThan(0);
  });

  it("Supabase がエラーならローカル JSON にフォールバック", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    select.mockResolvedValue({ data: null, error: { message: "boom" } });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await getRecipes()).toEqual(recipesJson);
    expect(spy).toHaveBeenCalled();
  });

  it("Supabase の行を変換して返す", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    select.mockResolvedValue({
      data: [{ id: "egg", name: "卵", reading: null, aliases: [], category: "egg_dairy", image: null }],
      error: null,
    });
    expect(await getIngredients()).toEqual([{ id: "egg", name: "卵", category: "egg_dairy" }]);
  });
});
