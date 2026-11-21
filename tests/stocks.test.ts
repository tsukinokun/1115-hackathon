import { beforeEach, describe, expect, it, vi } from "vitest";

// ストックの Server Actions の分岐を、Supabase を偽物にして確かめる
const URL_ = "https://x.supabase.co";
const fake = { getUser: vi.fn(), insert: vi.fn(), del: vi.fn(), list: vi.fn() };
vi.mock("@/lib/supabase/server", () => ({
  createUserClient: () => ({
    auth: { getUser: fake.getUser },
    from: () => ({
      insert: async (row: unknown) => fake.insert(row),
      delete: () => ({ eq: (_c1: string, v1: string) => ({ eq: async (_c2: string, v2: string) => fake.del(v1, v2) }) }),
      select: () => ({ eq: () => ({ order: async () => fake.list() }) }),
    }),
  }),
}));

const { addStock, removeStock, listStocks } = await import("@/app/actions/stocks");
const google = { data: { user: { id: "u1", is_anonymous: false } }, error: null };
const anonymous = { data: { user: { id: "a1", is_anonymous: true } }, error: null };

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", URL_);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  for (const f of Object.values(fake)) f.mockReset();
  fake.getUser.mockResolvedValue(google);
});

describe("addStock", () => {
  it("Google ログイン済みなら自分の名義で追加", async () => {
    fake.insert.mockReturnValue({ error: null });
    expect(await addStock("t", "gapao")).toEqual({ ok: true });
    expect(fake.insert).toHaveBeenCalledWith({ user_id: "u1", recipe_id: "gapao" });
  });
  it("もうストック済みでも ok", async () => {
    fake.insert.mockReturnValue({ error: { code: "23505" } });
    expect(await addStock("t", "gapao")).toEqual({ ok: true });
  });
  it("匿名ユーザーは login_required（DB には書かない）", async () => {
    fake.getUser.mockResolvedValue(anonymous);
    expect(await addStock("t", "gapao")).toMatchObject({ ok: false, error: "login_required" });
    expect(fake.insert).not.toHaveBeenCalled();
  });
  it("無いレシピは not_found", async () => {
    fake.insert.mockReturnValue({ error: { code: "23503" } });
    expect(await addStock("t", "nope")).toMatchObject({ ok: false, error: "not_found" });
    expect(await addStock("t", 123)).toMatchObject({ ok: false, error: "not_found" });
  });
  it("トークンが無い", async () => {
    expect(await addStock("", "gapao")).toMatchObject({ ok: false, error: "unauthorized" });
  });
});

describe("removeStock", () => {
  it("自分の行だけ消す", async () => {
    fake.del.mockReturnValue({ error: null });
    expect(await removeStock("t", "gapao")).toEqual({ ok: true });
    expect(fake.del).toHaveBeenCalledWith("u1", "gapao");
  });
});

describe("listStocks", () => {
  it("レシピに変換して新しい順のまま返す", async () => {
    const row = (id: string) => ({
      id, title: id, catch: "", description: null, author_name: "x", cover_image: null, minutes: 5, servings: 1,
      tags: {}, created_at: "2026-11-01T00:00:00+00:00", author: null, recipe_ingredients: [], recipe_steps: [], recipe_photos: [],
    });
    fake.list.mockReturnValue({
      data: [
        { created_at: "2026-11-21T10:00:00+00:00", recipe: row("gapao") },
        { created_at: "2026-11-21T09:00:00+00:00", recipe: null }, // 消えたレシピは出さない
        { created_at: "2026-11-21T08:00:00+00:00", recipe: row("tzatziki") },
      ],
      error: null,
    });
    const res = await listStocks("t");
    expect(res.ok && res.stocks.map((s) => s.recipe.id)).toEqual(["gapao", "tzatziki"]);
  });
  it("匿名ユーザーは空", async () => {
    fake.getUser.mockResolvedValue(anonymous);
    expect(await listStocks("t")).toEqual({ ok: true, stocks: [] });
    expect(fake.list).not.toHaveBeenCalled();
  });
});
