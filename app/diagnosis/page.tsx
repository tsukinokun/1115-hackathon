import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { getIngredients, getQuestions, getRecipes } from "@/lib/repository";
import { getReactionCounts } from "@/lib/reactions/read";
import { selectQuestions } from "@/lib/selectQuestions";
import { DiagnosisFlow } from "./_components/DiagnosisFlow";

export const metadata: Metadata = {
  title: "冷蔵庫診断",
  description: "冷蔵庫のメモに答えて、中身をまな板にのせたら、今日のあなたの「すき」が見つかるかも。",
};

/** 質問が増えても扉に貼るのは数枚。1日ごとに入れ替える */
async function getDoorQuestions() {
  "use cache";
  cacheLife("days");
  const today = new Date().toISOString().slice(0, 10);
  return selectQuestions(await getQuestions(), today);
}

export default async function DiagnosisPage() {
  const [questions, recipes, ingredients, counts] = await Promise.all([
    getDoorQuestions(),
    getRecipes(),
    getIngredients(),
    getReactionCounts(),
  ]);
  return <DiagnosisFlow questions={questions} recipes={recipes} ingredients={ingredients} counts={counts} />;
}
