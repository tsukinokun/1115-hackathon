"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { jitter } from "@/lib/jitter";
import type { DiagnosisResult, ReactionCounts } from "@/lib/types";
import { CountryChips } from "@/app/_components/CountryChips";
import { LikeButton } from "@/app/_components/LikeButton";
import { Photo } from "@/app/_components/Photo";
import {
  Cover,
  Gallery,
  IngredientsList,
  Lightbox,
  PlatePlaceholder,
  StepsList,
  type Zoomed,
} from "@/app/_components/recipe/RecipeParts";

type Props = { results: DiagnosisResult[]; counts: ReactionCounts; onRetry: () => void };

export function RecipeCard({ results, counts, onRetry }: Props) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState<Zoomed>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const main = results[index];
  const others = results.filter((_, i) => i !== index);
  const { recipe } = main;

  const show = (i: number) => {
    setIndex(i);
    sheetRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // カバーと同じ写真はギャラリーに重複させない
  const gallery = recipe.photos.filter((p) => p.url !== recipe.coverImage);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(58,47,42,0.35)] px-3 pt-10 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.article
        ref={sheetRef}
        className="receipt relative mb-[-8px] max-h-[90dvh] w-full max-w-[400px] overflow-y-auto overscroll-contain bg-[#fffdf6] px-5 pb-12 pt-5 text-ink shadow-[0_-6px_30px_rgba(0,0,0,0.2)]"
        initial={{ y: "105%", rotate: 4 }}
        animate={{ y: 0, rotate: -1.2 }}
        exit={{ y: "105%" }}
        transition={{ type: "spring", stiffness: 110, damping: 15, delay: 0.1 }}
        aria-live="polite"
      >
        <header className="flex items-baseline justify-between border-b-2 border-dashed border-ink/25 pb-2 font-mono text-[0.62rem] tracking-wider text-ink/50">
          <span>きょうのあなたへ</span>
          <span>No.{String(Math.round(jitter(recipe.id, 1000, 9999)))}</span>
        </header>

        <AnimatePresence mode="wait">
          <motion.section
            key={recipe.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <Cover recipe={recipe} onZoom={setZoomed} />

            <div className="mt-4 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[0.7rem] text-ink/55">{recipe.catch}</p>
                <h2 className="font-hand text-[1.7rem] leading-tight">{recipe.title}</h2>
                <p className="mt-1 flex flex-wrap gap-x-3 text-[0.68rem] text-ink/55">
                  <span>by {recipe.author.name}</span>
                  <span>⏱ {recipe.minutes}分</span>
                  <span>{recipe.servings}人分</span>
                </p>
                <CountryChips tags={recipe.tags} className="mt-1.5" />
              </div>
              <LikeButton key={recipe.id} recipeId={recipe.id} count={counts[recipe.id]?.likes ?? 0} className="shrink-0" />
            </div>
            <RecipeLinks recipeId={recipe.id} comments={counts[recipe.id]?.comments ?? 0} />
            {recipe.description && <p className="mt-2 text-[0.78rem] leading-relaxed">{recipe.description}</p>}

            <MatchMeter value={main.match} />
            <Reason result={main} />

            {gallery.length > 0 && <Gallery recipe={recipe} photos={gallery} onZoom={setZoomed} />}

            <IngredientsList recipe={recipe} have={main.matchedIngredients} />
            <StepsList recipe={recipe} onZoom={setZoomed} />
          </motion.section>
        </AnimatePresence>

        {others.length > 0 && (
          <div className="mt-7">
            <p className="font-hand text-sm text-ink/60">こっちも好きかも…</p>
            <div className="mt-2 flex gap-3">
              {others.map((o) => (
                <motion.button
                  type="button"
                  key={o.recipe.id}
                  onClick={() => show(results.indexOf(o))}
                  className="flex-1 overflow-hidden rounded-[3px_10px_4px_3px] bg-[#fff1c2] text-left shadow-[1px_3px_5px_rgba(0,0,0,0.1)]"
                  style={{ rotate: `${jitter(o.recipe.id, -4, 4)}deg` }}
                  whileHover={{ rotate: 0, y: -3 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <span className="relative block h-16">
                    {o.recipe.coverImage ? (
                      <Photo src={o.recipe.coverImage} alt="" sizes="180px" fallback={<PlatePlaceholder title={o.recipe.title} />} />
                    ) : (
                      <PlatePlaceholder title={o.recipe.title} />
                    )}
                  </span>
                  <span className="block p-2">
                    <span className="block text-[0.72rem] font-bold leading-tight">{o.recipe.title}</span>
                    <span className="text-[0.62rem] text-ink/50">
                      {o.match >= 20 ? `相性 ${o.match}%` : "意外な出会いかも？"}
                    </span>
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <motion.button
            type="button"
            onClick={onRetry}
            className="font-hand rounded-full border-2 border-ink px-5 py-2 text-sm shadow-[2px_3px_0_var(--ink)]"
            whileHover={{ rotate: -2 }}
            whileTap={{ x: 2, y: 2, boxShadow: "0px 1px 0 var(--ink)" }}
          >
            ↺ もう一回、冷蔵庫をあける
          </motion.button>
        </div>
        <p className="mt-4 text-center">
          <Link
            href="/recipes/new"
            className="font-hand text-[0.8rem] text-ink/60 underline decoration-[var(--tomato)] decoration-wavy underline-offset-4 hover:text-ink"
          >
            自分のレシピも貼ってみる
          </Link>
        </p>
      </motion.article>

      <Lightbox zoomed={zoomed} onClose={() => setZoomed(null)} />
    </motion.div>
  );
}

/** レシピページとコメントへの入口 */
function RecipeLinks({ recipeId, comments }: { recipeId: string; comments: number }) {
  const base = `/recipes/${encodeURIComponent(recipeId)}`;
  return (
    <p className="font-hand mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.78rem]">
      <Link href={base} className="text-ink/70 underline decoration-dotted underline-offset-4 hover:text-ink">
        レシピページへ →
      </Link>
      <Link href={`${base}/comments`} className="text-ink/70 underline decoration-dotted underline-offset-4 hover:text-ink">
        みんなのひとこと（{comments}）
      </Link>
    </p>
  );
}

/** 手描き風の相性メーター */
function MatchMeter({ value }: { value: number }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <span className="text-[0.7rem] font-bold">相性</span>
      <svg viewBox="0 0 200 16" className="h-4 flex-1" aria-hidden>
        <path d="M3 9 Q 50 6 100 9 T 197 8" stroke="rgba(58,47,42,0.12)" strokeWidth="9" fill="none" strokeLinecap="round" />
        <motion.path
          d="M3 9 Q 50 6 100 9 T 197 8"
          stroke="var(--tomato)"
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: value / 100 }}
          transition={{ duration: 1.1, delay: 0.5, ease: "easeOut" }}
        />
      </svg>
      <motion.span
        className="font-hand text-2xl text-[var(--tomato)]"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: -8 }}
        transition={{ delay: 1.3, type: "spring", stiffness: 400, damping: 12 }}
      >
        {value}%
      </motion.span>
    </div>
  );
}

function Reason({ result }: { result: DiagnosisResult }) {
  const { moodReasons, matchedIngredients } = result;
  return (
    <p className="mt-3 text-[0.78rem] leading-relaxed">
      {moodReasons.length > 0 && (
        <>
          {moodReasons.map((r) => (
            <mark key={r} className="mx-0.5 rounded-sm bg-[#ffe27a]/70 px-1 text-ink">
              {r}
            </mark>
          ))}
          な気分
        </>
      )}
      {matchedIngredients.length > 0 && (
        <>
          {moodReasons.length > 0 ? "と、" : ""}冷蔵庫の
          {matchedIngredients.map((r) => (
            <mark key={r} className="mx-0.5 rounded-sm bg-[#d3f2b0] px-1 text-ink">
              {r}
            </mark>
          ))}
        </>
      )}
      {moodReasons.length + matchedIngredients.length > 0 ? "から選んだよ。" : "今日はなんとなく、これ。"}
    </p>
  );
}
