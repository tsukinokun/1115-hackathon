// Supabase の行 → lib/types.ts の形。null は「無し」として省く（JSON データと同じ形になる）
import type {
  Ingredient,
  IngredientCategory,
  Question,
  QuestionKind,
  Recipe,
  RecipeComment,
  RecipePhoto,
  TagWeights,
} from "../types";

export const INGREDIENT_SELECT = "id, name, reading, aliases, category, image";
export const RECIPE_SELECT =
  "id, title, catch, description, author_name, cover_image, minutes, servings, tags, created_at," +
  " author:profiles(name)," +
  " recipe_ingredients(position, ingredient_id, name, amount)," +
  " recipe_steps(position, text, image_url)," +
  " recipe_photos(url, caption, kind, created_at)";
export const QUESTION_SELECT =
  "id, kind, text, note, multiple, priority, question_options(id, position, label, emoji, image, tags)";

export type IngredientRow = {
  id: string;
  name: string;
  reading: string | null;
  aliases: string[] | null;
  category: IngredientCategory;
  image: string | null;
};

export type RecipeRow = {
  id: string;
  title: string;
  catch: string;
  description: string | null;
  author_name: string | null;
  cover_image: string | null;
  minutes: number;
  servings: number;
  tags: TagWeights | null;
  created_at: string;
  author: { name: string } | null;
  recipe_ingredients: { position: number; ingredient_id: string | null; name: string; amount: string }[];
  recipe_steps: { position: number; text: string; image_url: string | null }[];
  recipe_photos: { url: string; caption: string | null; kind: RecipePhoto["kind"]; created_at: string }[];
};

export type QuestionRow = {
  id: string;
  kind: QuestionKind;
  text: string;
  note: string | null;
  multiple: boolean;
  priority: number | null;
  question_options: {
    id: string;
    position: number;
    label: string;
    emoji: string | null;
    image: string | null;
    tags: TagWeights | null;
  }[];
};

export const DEFAULT_AUTHOR = "ななしの台所";

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

/** PostgreSQL の timestamptz（+00:00, マイクロ秒）を JSON と同じ 2026-11-01T12:00:00Z 形式にそろえる */
export function toIsoString(ts: string) {
  return new Date(ts).toISOString().replace(".000Z", "Z");
}

export function toIngredient(row: IngredientRow): Ingredient {
  return {
    id: row.id,
    name: row.name,
    ...(row.reading ? { reading: row.reading } : {}),
    ...(row.aliases?.length ? { aliases: row.aliases } : {}),
    category: row.category,
    ...(row.image ? { image: row.image } : {}),
  };
}

export function toRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    catch: row.catch,
    ...(row.description ? { description: row.description } : {}),
    author: { name: row.author?.name ?? row.author_name ?? DEFAULT_AUTHOR },
    coverImage: row.cover_image,
    photos: [...row.recipe_photos]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((p) => ({ url: p.url, ...(p.caption ? { caption: p.caption } : {}), kind: p.kind })),
    minutes: row.minutes,
    servings: row.servings,
    tags: row.tags ?? {},
    ingredients: [...row.recipe_ingredients].sort(byPosition).map((i) => ({
      ...(i.ingredient_id ? { ingredientId: i.ingredient_id } : {}),
      name: i.name,
      amount: i.amount,
    })),
    steps: [...row.recipe_steps]
      .sort(byPosition)
      .map((s) => ({ text: s.text, ...(s.image_url ? { image: s.image_url } : {}) })),
    createdAt: toIsoString(row.created_at),
  };
}

export function toQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    kind: row.kind,
    text: row.text,
    ...(row.note ? { note: row.note } : {}),
    multiple: row.multiple,
    ...(row.priority ? { priority: row.priority } : {}),
    options: [...row.question_options].sort(byPosition).map((o) => ({
      id: o.id,
      label: o.label,
      tags: o.tags ?? {},
      ...(o.emoji ? { emoji: o.emoji } : {}),
      ...(o.image ? { image: o.image } : {}),
    })),
  };
}

/* ---------- スキ・コメント ---------- */

export const COMMENT_SELECT = "id, recipe_id, body, photo_url, created_at, author:profiles(name)";

export type CommentRow = {
  id: number | string;
  recipe_id: string;
  body: string;
  photo_url: string | null;
  created_at: string;
  author: { name: string } | null;
};

export function toComment(row: CommentRow): RecipeComment {
  return {
    id: String(row.id),
    recipeId: row.recipe_id,
    author: { name: row.author?.name ?? DEFAULT_AUTHOR },
    body: row.body,
    ...(row.photo_url ? { photo: row.photo_url } : {}),
    createdAt: toIsoString(row.created_at),
  };
}
