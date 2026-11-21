import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getComments, getReactionCounts } from "@/lib/reactions/read";
import { getRecipes } from "@/lib/repository";
import { RecipeView } from "./_components/RecipeView";

type Params = { params: Promise<{ id: string }> };

// いまあるレシピはビルド時に作っておく。あとから投稿されたレシピは、初めて開かれたときに作られる
export async function generateStaticParams() {
  const recipes = await getRecipes();
  return recipes.map((r) => ({ id: r.id }));
}

async function findRecipe(id: string) {
  return (await getRecipes()).find((r) => r.id === id);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const recipe = await findRecipe((await params).id);
  if (!recipe) return { title: "レシピが見つかりません | きょうのすき" };
  return { title: `${recipe.title} | きょうのすき`, description: recipe.catch || recipe.description };
}

export default async function RecipePage({ params }: Params) {
  const { id } = await params;
  const recipe = await findRecipe(id);
  if (!recipe) notFound();
  const [counts, comments] = await Promise.all([getReactionCounts(), getComments(id)]);
  const c = counts[id] ?? { likes: 0, comments: 0 };
  return <RecipeView recipe={recipe} likes={c.likes} commentCount={c.comments} latest={comments.slice(0, 3)} />;
}
