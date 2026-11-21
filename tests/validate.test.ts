import { describe, expect, it } from "vitest";
import { validateIngredient, validatePhoto, validateProfileName, validateRecipe } from "@/lib/posting/validate";

const OWN = "https://x.supabase.co/storage/v1/object/public/recipe-photos/u1/";
const isOwn = (url: string) => url.startsWith(OWN);
const good = {
  title: " 卵かけごはん ",
  minutes: 3,
  servings: 1,
  tags: { quick: 3, comfort: 1 },
  ingredients: [{ ingredientId: "egg", name: "卵", amount: "1個" }, { name: "しょうゆ" }],
  steps: [{ text: "ごはんに卵をのせる" }, { text: "しょうゆをかける", image: `${OWN}a.jpg` }],
};

describe("validateRecipe", () => {
  it("正しい入力は整えて通す（前後の空白を取る・分量の省略は空文字）", () => {
    const r = validateRecipe(good, isOwn);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.title).toBe("卵かけごはん");
    expect(r.value.ingredients[1]).toEqual({ ingredientId: undefined, name: "しょうゆ", amount: "" });
    expect(r.value.steps[1].image).toBe(`${OWN}a.jpg`);
  });

  it.each([
    ["料理名が空", { ...good, title: "  " }],
    ["料理名が長すぎ", { ...good, title: "あ".repeat(61) }],
    ["調理時間が0", { ...good, minutes: 0 }],
    ["調理時間が小数", { ...good, minutes: 1.5 }],
    ["人数が文字列", { ...good, servings: "2" }],
    ["材料が空", { ...good, ingredients: [] }],
    ["手順が空", { ...good, steps: [] }],
    ["タグの重みが大きすぎ", { ...good, tags: { quick: 9 } }],
    ["タグ名が不正", { ...good, tags: { "<script>": 1 } }],
    ["他人の写真 URL", { ...good, coverImage: "https://evil.example/a.jpg" }],
    ["手順の写真が他人のもの", { ...good, steps: [{ text: "x", image: "https://x.supabase.co/storage/v1/object/public/recipe-photos/u2/a.jpg" }] }],
    ["そもそもオブジェクトでない", "卵かけごはん"],
  ])("NG: %s", (_label, input) => {
    const r = validateRecipe(input, isOwn);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBeTruthy();
  });
});

describe("validatePhoto / validateIngredient / validateProfileName", () => {
  it("写真", () => {
    expect(validatePhoto({ recipeId: "gapao", url: `${OWN}b.jpg`, kind: "finished" }, isOwn).ok).toBe(true);
    expect(validatePhoto({ recipeId: "gapao", url: `${OWN}b.jpg`, kind: "other" }, isOwn).ok).toBe(false);
    expect(validatePhoto({ recipeId: "gapao", kind: "finished" }, isOwn).ok).toBe(false);
  });
  it("食材", () => {
    expect(validateIngredient({ name: "パクチー", reading: "ぱくちー", aliases: ["香菜"], category: "vegetable" }).ok).toBe(true);
    expect(validateIngredient({ name: "パクチー", reading: "パクチー", category: "vegetable" }).ok).toBe(false);
    expect(validateIngredient({ name: "パクチー", category: "herb" }).ok).toBe(false);
  });
  it("名前", () => {
    expect(validateProfileName("はなこ")).toEqual({ ok: true, value: "はなこ" });
    expect(validateProfileName("").ok).toBe(false);
    expect(validateProfileName("あ".repeat(21)).ok).toBe(false);
  });
});
