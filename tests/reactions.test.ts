import { beforeEach, describe, expect, it, vi } from "vitest";

// スキ・コメントの Server Actions を、Supabase と next/cache を偽物にして確かめる
const updateTag = vi.fn();
vi.mock("next/cache", () => ({ updateTag, cacheTag: vi.fn(), cacheLife: vi.fn() }));

const URL_ = "https://x.supabase.co";
const OWN = `${URL_}/storage/v1/object/public/recipe-photos/u1/`;
const OTHER = `${URL_}/storage/v1/object/public/recipe-photos/u2/`;

type Result = { data?: unknown; error?: { code?: string } | null; count?: number | null };
/** `${table}.${select|insert|delete}` ごとに、返す結果を順番に積んでおく */
const queue: Record<string, Result[]> = {};
const calls: { table: string; op: string; args: unknown[] }[] = [];
const getUser = vi.fn();

function chain(table: string, op: string, args: unknown[]) {
  calls.push({ table, op, args });
  let res: Result | undefined;
  const get = () => (res ??= queue[`${table}.${op}`]?.shift() ?? { data: null, error: null });
  const c: Record<string, unknown> = {
    eq: () => c,
    select: () => c,
    order: () => c,
    limit: () => c,
    maybeSingle: async () => get(),
    single: async () => get(),
    then: (ok: (v: Result) => unknown, ng: (e: unknown) => unknown) => Promise.resolve(get()).then(ok, ng),
  };
  return c;
}

vi.mock("@/lib/supabase/server", () => ({
  createUserClient: () => ({
    auth: { getUser },
    from: (table: string) => ({
      select: (...a: unknown[]) => chain(table, "select", a),
      insert: (...a: unknown[]) => chain(table, "insert", a),
      delete: (...a: unknown[]) => chain(table, "delete", a),
    }),
  }),
  createReadClient: () => null,
}));

const actions = await import("@/app/actions/reactions");
const { validateComment } = await import("@/lib/posting/validate");

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", URL_);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  for (const k of Object.keys(queue)) delete queue[k];
  calls.length = 0;
  updateTag.mockReset();
  getUser.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("validateComment", () => {
  const own = (u: string) => u.startsWith(OWN);
  it("前後の空白を落として受け付ける", () => {
    expect(validateComment({ recipeId: "gapao", body: "  おいしい  " }, own)).toEqual({
      ok: true,
      value: { recipeId: "gapao", body: "おいしい", photoUrl: undefined },
    });
  });
  it("空・300文字を超える・他人の写真はだめ", () => {
    expect(validateComment({ recipeId: "gapao", body: "   " }, own).ok).toBe(false);
    expect(validateComment({ recipeId: "gapao", body: "あ".repeat(301) }, own).ok).toBe(false);
    expect(validateComment({ recipeId: "gapao", body: "あ".repeat(300) }, own).ok).toBe(true);
    expect(validateComment({ recipeId: "gapao", body: "見て", photoUrl: `${OTHER}a.jpg` }, own).ok).toBe(false);
  });
});

describe("toggleLike", () => {
  it("まだなら付けて、数を返す", async () => {
    queue["recipe_likes.select"] = [{ data: null, error: null }, { count: 3, error: null }];
    queue["recipe_likes.insert"] = [{ error: null }];
    expect(await actions.toggleLike("token", "gapao")).toEqual({ ok: true, liked: true, count: 3 });
    expect(calls.find((c) => c.op === "insert")?.args[0]).toEqual({ recipe_id: "gapao", user_id: "u1" });
    expect(updateTag).toHaveBeenCalledWith("reactions");
  });

  it("もう付いていたら外す", async () => {
    queue["recipe_likes.select"] = [{ data: { recipe_id: "gapao" }, error: null }, { count: 2, error: null }];
    queue["recipe_likes.delete"] = [{ error: null }];
    expect(await actions.toggleLike("token", "gapao")).toEqual({ ok: true, liked: false, count: 2 });
    expect(calls.some((c) => c.op === "insert")).toBe(false);
  });

  it("連打で二重に入っても（23505）付いた扱い", async () => {
    queue["recipe_likes.select"] = [{ data: null, error: null }, { count: 1, error: null }];
    queue["recipe_likes.insert"] = [{ error: { code: "23505" } }];
    expect(await actions.toggleLike("token", "gapao")).toMatchObject({ ok: true, liked: true });
  });

  it("無いレシピは not_found", async () => {
    queue["recipe_likes.insert"] = [{ error: { code: "23503" } }];
    expect(await actions.toggleLike("token", "nope")).toMatchObject({ ok: false, error: "not_found" });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("未設定・未ログイン", async () => {
    expect(await actions.toggleLike("", "gapao")).toMatchObject({ ok: false, error: "unauthorized" });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(await actions.toggleLike("token", "gapao")).toMatchObject({ ok: false, error: "supabase_not_configured" });
  });
});

describe("addComment", () => {
  const row = {
    id: 5,
    recipe_id: "gapao",
    body: "おいしい",
    photo_url: `${OWN}c.jpg`,
    created_at: "2026-11-21T03:00:00+00:00",
    author: { name: "はなこ" },
  };

  it("自分の名義で保存して、画面用の形で返す", async () => {
    queue["recipe_comments.insert"] = [{ data: row, error: null }];
    const res = await actions.addComment("token", { recipeId: "gapao", body: "おいしい", photoUrl: `${OWN}c.jpg` });
    expect(res).toEqual({
      ok: true,
      comment: { id: "5", recipeId: "gapao", author: { name: "はなこ" }, body: "おいしい", photo: `${OWN}c.jpg`, createdAt: "2026-11-21T03:00:00Z" },
    });
    expect(calls.find((c) => c.op === "insert")?.args[0]).toMatchObject({ user_id: "u1", recipe_id: "gapao" });
    expect(updateTag).toHaveBeenCalledWith("reactions");
  });

  it("他人の写真・空のコメントは保存しない", async () => {
    expect(await actions.addComment("token", { recipeId: "gapao", body: "x", photoUrl: `${OTHER}c.jpg` })).toMatchObject({ error: "invalid_input" });
    expect(await actions.addComment("token", { recipeId: "gapao", body: "" })).toMatchObject({ error: "invalid_input" });
    expect(calls.some((c) => c.op === "insert")).toBe(false);
  });

  it("無いレシピは not_found", async () => {
    queue["recipe_comments.insert"] = [{ data: null, error: { code: "23503" } }];
    expect(await actions.addComment("token", { recipeId: "nope", body: "x" })).toMatchObject({ error: "not_found" });
  });
});

describe("deleteComment", () => {
  it("自分のを消せる", async () => {
    queue["recipe_comments.delete"] = [{ data: [{ id: 5 }], error: null }];
    expect(await actions.deleteComment("token", "5")).toEqual({ ok: true });
  });
  it("他人の（消えた行が無い）は not_found、変な id は invalid_input", async () => {
    queue["recipe_comments.delete"] = [{ data: [], error: null }];
    expect(await actions.deleteComment("token", "5")).toMatchObject({ error: "not_found" });
    expect(await actions.deleteComment("token", "1; drop table")).toMatchObject({ error: "invalid_input" });
  });
});
