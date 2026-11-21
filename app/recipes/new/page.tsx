import type { Metadata } from "next";
import { getIngredients, getQuestions } from "@/lib/repository";
import { RecipeForm } from "./_components/RecipeForm";

export const metadata: Metadata = {
  title: "レシピを貼る | きょうのすき",
  description: "あなたの好きな料理を、冷蔵庫に貼ろう。だれかの「すき」になるかもしれない。",
};

export default async function NewRecipePage() {
  const [questions, ingredients] = await Promise.all([getQuestions(), getIngredients()]);
  return <RecipeForm questions={questions} ingredients={ingredients} />;
}
