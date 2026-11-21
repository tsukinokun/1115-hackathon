import { beforeEach, describe, expect, it, vi } from "vitest";

// Server Actions の分岐を、Supabase と next/cache を偽物にして確かめる
const updateTag = vi.fn();
vi.mock("next/cache", () => ({ updateTag, cacheTag: vi.fn(), cacheLife: vi.fn() }));

const URL_ = "https://x.supabase.co";
const OWN = `${URL_}/storage/v1/object/public/recipe-photos/u1/`;
const fake = {
  getUser: vi.fn(),
  rpc: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  selectByName: vi.fn(),
};
vi.mock("@/lib/supabase/server", () => ({
  createUserClient: () => ({
    auth: { getUser: fake.getUser },
    rpc: fake.rpc,
    from: (table: string) => ({
      insert: (row: unknown) => {
        const res = fake.insert(table, row);
        return Object.assign(Promise.resolve(res), { select: () => ({ single: async () => res }) });
      },
      update: (row: unknown) => ({ eq: async () => fake.update(table, row) }),
      select: () => ({ eq: () => ({ single: fake.selectByName }) }),
    }),
  }),
}));

const actions = await import("@/app/actions/posting");
const recipe = {
  title: "卵かけごはん",
  minutes: 3,
  servings: 1,
  tags: { quick: 3 },
  coverImage: `${OWN}cover.jpg`,
  ingredients: [{ ingredientId: "egg", name: "卵", amount: "1個" }],
  steps: [{ text: "混ぜる" }],
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", URL_);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  for (const f of Object.values(fake)) f.mockReset();
  updateTag.mockReset();
  fake.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("createRecipe", () => {
  it("投稿できたら id を返し、レシピのキャッシュを捨てる", async () => {
    fake.rpc.mockResolvedValue({ data: "new-id", error: null });
    expect(await actions.createRecipe("token", recipe)).toEqual({ ok: true, id: "new-id" });
    expect(fake.rpc).toHaveBeenCalledWith("create_recipe", expect.objectContaining({ p_title: "卵かけごはん", p_cover_image: `${OWN}cover.jpg` }));
    expect(updateTag).toHaveBeenCalledWith("recipes");
  });

  it("Supabase 未設定", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(await actions.createRecipe("token", recipe)).toMatchObject({ ok: false, error: "supabase_not_configured" });
  });

  it("トークンが無い・無効", async () => {
    expect(await actions.createRecipe("", recipe)).toMatchObject({ ok: false, error: "unauthorized" });
    fake.getUser.mockResolvedValue({ data: { user: null }, error: { message: "bad jwt" } });
    expect(await actions.createRecipe("bad", recipe)).toMatchObject({ ok: false, error: "unauthorized" });
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("他人のフォルダの写真は使えない", async () => {
    fake.getUser.mockResolvedValue({ data: { user: { id: "u2" } }, error: null });
    expect(await actions.createRecipe("token", recipe)).toMatchObject({ ok: false, error: "invalid_input" });
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("存在しない食材 id は invalid_reference", async () => {
    fake.rpc.mockResolvedValue({ data: null, error: { code: "23503" } });
    expect(await actions.createRecipe("token", recipe)).toMatchObject({ ok: false, error: "invalid_reference" });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("addRecipePhoto", () => {
  it("自分の名義で保存する", async () => {
    fake.insert.mockReturnValue({ error: null });
    const res = await actions.addRecipePhoto("token", { recipeId: "gapao", url: `${OWN}p.jpg`, kind: "finished", caption: "できた" });
    expect(res).toEqual({ ok: true });
    expect(fake.insert).toHaveBeenCalledWith("recipe_photos", expect.objectContaining({ posted_by: "u1", recipe_id: "gapao" }));
  });
  it("無いレシピは not_found", async () => {
    fake.insert.mockReturnValue({ error: { code: "23503" } });
    expect(await actions.addRecipePhoto("token", { recipeId: "nope", url: `${OWN}p.jpg`, kind: "finished" })).toMatchObject({
      ok: false,
      error: "not_found",
    });
  });
});

describe("addIngredient", () => {
  it("新しく作る", async () => {
    fake.insert.mockReturnValue({ data: { id: "uuid-1" }, error: null });
    expect(await actions.addIngredient("token", { name: "パクチー", category: "vegetable" })).toEqual({ ok: true, id: "uuid-1", created: true });
    expect(updateTag).toHaveBeenCalledWith("ingredients");
  });
  it("同じ名前があればその id を返す", async () => {
    fake.insert.mockReturnValue({ data: null, error: { code: "23505" } });
    fake.selectByName.mockResolvedValue({ data: { id: "egg" }, error: null });
    expect(await actions.addIngredient("token", { name: "卵", category: "egg_dairy" })).toEqual({ ok: true, id: "egg", created: false });
  });
});

describe("updateProfileName", () => {
  it("名前を変える", async () => {
    fake.update.mockReturnValue({ error: null });
    expect(await actions.updateProfileName("token", "はなこ")).toEqual({ ok: true });
    expect(fake.update).toHaveBeenCalledWith("profiles", { name: "はなこ" });
  });
});
