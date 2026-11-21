/**
 * 投稿の上限値。バックエンドの lib/posting/validate.ts（validateRecipe）と同じ値にしている。
 * サーバー側でも必ずチェックされるので、ここは「送る前に教えてあげる」ためのもの。
 * 値を変えるときはバックエンド担当と合わせること。
 */
export const LIMITS = {
  title: 60,
  catch: 80,
  description: 500,
  minutes: { min: 1, max: 600 },
  servings: { min: 1, max: 20 },
  ingredients: { min: 1, max: 40 },
  ingredientName: 40,
  amount: 40,
  steps: { min: 1, max: 30 },
  stepText: 400,
  tagWeight: { min: 0, max: 5 },
  tagCount: 20,
  authorName: 20,
  /** 国はいくつでも…と言いたいが、タグ20個の枠を気分と分け合うので5つまで */
  countries: 5,
} as const;
