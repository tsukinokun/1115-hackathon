import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getComments } from "@/lib/reactions/read";
import { getRecipes } from "@/lib/repository";
import { CommentBoard } from "./_components/CommentBoard";

type Params = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  const recipes = await getRecipes();
  return recipes.map((r) => ({ id: r.id }));
}

async function findRecipe(id: string) {
  return (await getRecipes()).find((r) => r.id === id);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const recipe = await findRecipe((await params).id);
  return { title: recipe ? `みんなのひとこと：${recipe.title}` : "レシピが見つかりません" };
}

export default async function CommentsPage({ params }: Params) {
  const { id } = await params;
  const recipe = await findRecipe(id);
  if (!recipe) notFound();
  const comments = await getComments(id);
  return <CommentBoard recipe={{ id: recipe.id, title: recipe.title, coverImage: recipe.coverImage }} comments={comments} />;
}
