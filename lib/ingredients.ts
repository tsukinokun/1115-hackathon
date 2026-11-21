import type { Ingredient, IngredientCategory, PantryItem, Recipe } from "./types";

/** 表記ゆれを吸収した比較用キー（全角半角・カタカナ/ひらがな・空白・大小文字） */
export function normalizeName(s: string) {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/** 食材が持つ全ての呼び名の正規化キー */
export function keysOf(i: Pick<Ingredient, "name" | "reading" | "aliases">) {
  return new Set([i.name, i.reading, ...(i.aliases ?? [])].filter(Boolean).map((s) => normalizeName(s!)));
}

/** 名前・読み・別名の部分一致。前方一致を優先する */
export function searchIngredients(all: Ingredient[], query: string, limit = 6) {
  const q = normalizeName(query);
  if (!q) return [];
  return all
    .map((i) => {
      const keys = [...keysOf(i)];
      const score = keys.some((k) => k === q) ? 3 : keys.some((k) => k.startsWith(q)) ? 2 : keys.some((k) => k.includes(q)) ? 1 : 0;
      return { i, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.i);
}

/** マスタから名前で探す（自由入力をマスタに寄せる） */
export function findByName(all: Ingredient[], name: string) {
  const k = normalizeName(name);
  return all.find((i) => keysOf(i).has(k));
}

export type Shelf = "door" | "top" | "middle" | "drawer";

export function shelfOf(category: IngredientCategory | undefined): Shelf {
  switch (category) {
    case "seasoning":
      return "door";
    case "egg_dairy":
    case "soy":
      return "top";
    case "vegetable":
      return "drawer";
    default:
      return "middle";
  }
}

/** レシピでよく使われる順。投稿が増えるほど冷蔵庫の手前に来る */
export function sortByPopularity(all: Ingredient[], recipes: Recipe[]) {
  const count = new Map<string, number>();
  for (const r of recipes) for (const ri of r.ingredients) if (ri.ingredientId) count.set(ri.ingredientId, (count.get(ri.ingredientId) ?? 0) + 1);
  return [...all].sort((a, b) => (count.get(b.id) ?? 0) - (count.get(a.id) ?? 0));
}

/** パントリーの食材を一意に識別するキー */
export const pantryKey = (p: PantryItem) => p.ingredientId ?? `free:${normalizeName(p.name)}`;
