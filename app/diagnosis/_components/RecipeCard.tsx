"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { hash, jitter } from "@/lib/jitter";
import type { DiagnosisResult, Recipe } from "@/lib/types";
import { CountryChips } from "@/app/_components/CountryChips";
import { Photo } from "@/app/_components/Photo";

type Props = { results: DiagnosisResult[]; onRetry: () => void };

type Zoomed = { url: string; caption?: string; id: string } | null;

export function RecipeCard({ results, onRetry }: Props) {
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

            <p className="mt-4 text-[0.7rem] text-ink/55">{recipe.catch}</p>
            <h2 className="font-hand text-[1.7rem] leading-tight">{recipe.title}</h2>
            <p className="mt-1 flex flex-wrap gap-x-3 text-[0.68rem] text-ink/55">
              <span>by {recipe.author.name}</span>
              <span>⏱ {recipe.minutes}分</span>
              <span>{recipe.servings}人分</span>
            </p>
            <CountryChips tags={recipe.tags} className="mt-1.5" />
            {recipe.description && <p className="mt-2 text-[0.78rem] leading-relaxed">{recipe.description}</p>}

            <MatchMeter value={main.match} />
            <Reason result={main} />

            {gallery.length > 0 && <Gallery recipe={recipe} photos={gallery} onZoom={setZoomed} />}

            <h3 className="mt-5 text-xs font-bold">
              材料 <span className="font-normal text-ink/50">（{recipe.servings}人分）</span>
            </h3>
            <ul className="mt-1.5 space-y-1 text-[0.8rem]">
              {recipe.ingredients.map((ing, i) => {
                const have = main.matchedIngredients.includes(ing.name);
                return (
                  <li key={`${ing.name}-${i}`} className="flex items-baseline gap-2">
                    <span className={`w-4 shrink-0 text-center ${have ? "text-[#3d9a5f]" : "text-ink/25"}`}>{have ? "✔" : "・"}</span>
                    <span>{ing.name}</span>
                    <span className="min-w-4 flex-1 border-b border-dotted border-ink/20" />
                    <span className="text-ink/60">{ing.amount}</span>
                  </li>
                );
              })}
            </ul>

            <h3 className="mt-5 text-xs font-bold">
              つくりかた <span className="font-normal text-ink/50">（全{recipe.steps.length}工程）</span>
            </h3>
            <ol className="mt-2 space-y-3 text-[0.8rem] leading-relaxed">
              {recipe.steps.map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span
                    className="font-hand grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-[var(--tomato)] text-xs text-[var(--tomato)]"
                    style={{ rotate: `${jitter(recipe.id + i, -12, 12)}deg` }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p>{s.text}</p>
                    {s.image && (
                      <button
                        type="button"
                        onClick={() => setZoomed({ url: s.image!, caption: `工程 ${i + 1}`, id: `step-${recipe.id}-${i}` })}
                        className="mt-1.5 block"
                        aria-label={`工程${i + 1}の写真を大きく見る`}
                      >
                        <motion.span
                          layoutId={`step-${recipe.id}-${i}`}
                          className="relative block h-24 w-32 overflow-hidden rounded-[4px] border-4 border-white shadow-[1px_2px_5px_rgba(0,0,0,0.18)]"
                          style={{ rotate: `${jitter(recipe.id + i + "p", -3, 3)}deg` }}
                        >
                          <Photo src={s.image} alt={`工程${i + 1}`} sizes="128px" />
                        </motion.span>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
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

/** ポラロイド風に貼った完成写真。無ければ皿のイラスト */
function Cover({ recipe, onZoom }: { recipe: Recipe; onZoom: (z: Zoomed) => void }) {
  const id = `cover-${recipe.id}`;
  const tilt = jitter(recipe.id + "cover", -3.5, 2.5);
  const inner = recipe.coverImage ? (
    <Photo src={recipe.coverImage} alt={recipe.title} sizes="360px" eager fallback={<PlatePlaceholder title={recipe.title} />} />
  ) : (
    <PlatePlaceholder title={recipe.title} />
  );

  return (
    <div className="relative mx-auto mt-4 w-[88%]" style={{ rotate: `${tilt}deg` }}>
      <span className="absolute -top-2.5 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rotate-[4deg] bg-[rgba(255,226,122,0.75)] shadow-sm" aria-hidden />
      <button
        type="button"
        disabled={!recipe.coverImage}
        onClick={() => recipe.coverImage && onZoom({ url: recipe.coverImage, caption: recipe.title, id })}
        className="block w-full bg-white p-2 pb-7 shadow-[2px_5px_10px_rgba(0,0,0,0.15)]"
        aria-label={recipe.coverImage ? "完成写真を大きく見る" : undefined}
      >
        <motion.span layoutId={id} className="relative block aspect-[4/3] overflow-hidden">
          {inner}
        </motion.span>
        <span className="font-hand absolute bottom-1.5 left-3 text-[0.72rem] text-ink/50">
          {recipe.coverImage ? "できあがり" : "写真まだないよ。つくったら投稿してね"}
        </span>
      </button>
    </div>
  );
}

/** 完成写真・途中経過の横スクロール */
function Gallery({ recipe, photos, onZoom }: { recipe: Recipe; photos: Recipe["photos"]; onZoom: (z: Zoomed) => void }) {
  return (
    <div className="mt-5">
      <h3 className="text-xs font-bold">
        写真 <span className="font-normal text-ink/50">{photos.length}枚</span>
      </h3>
      <div className="no-scrollbar -mx-5 mt-2 flex snap-x gap-3 overflow-x-auto px-5 pb-2 pt-1">
        {photos.map((p, i) => {
          const id = `photo-${recipe.id}-${i}`;
          return (
            <button
              type="button"
              key={id}
              onClick={() => onZoom({ url: p.url, caption: p.caption, id })}
              className="w-32 shrink-0 snap-start bg-white p-1.5 pb-1 text-left shadow-[1px_3px_6px_rgba(0,0,0,0.14)]"
              style={{ rotate: `${jitter(id, -4, 4)}deg` }}
            >
              <motion.span layoutId={id} className="relative block aspect-square overflow-hidden">
                <Photo src={p.url} alt={p.caption ?? ""} sizes="128px" />
              </motion.span>
              <span
                className={`mt-1 inline-block rounded-full px-1.5 text-[0.55rem] font-bold text-white ${p.kind === "finished" ? "bg-[var(--tomato)]" : "bg-[#3c8dde]"}`}
              >
                {p.kind === "finished" ? "完成" : "途中"}
              </span>
              {p.caption && <span className="block truncate text-[0.62rem] text-ink/60">{p.caption}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Lightbox({ zoomed, onClose }: { zoomed: Zoomed; onClose: () => void }) {
  return (
    <AnimatePresence>
      {zoomed && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[rgba(30,24,20,0.82)] p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-label={zoomed.caption ?? "写真"}
        >
          <motion.div layoutId={zoomed.id} className="relative aspect-[4/3] w-full max-w-[520px] overflow-hidden rounded-[4px] border-[6px] border-white">
            <Photo src={zoomed.url} alt={zoomed.caption ?? ""} sizes="520px" />
          </motion.div>
          {zoomed.caption && <p className="font-hand mt-3 -rotate-2 text-white">{zoomed.caption}</p>}
          <p className="mt-2 text-[0.65rem] text-white/50">タップで閉じる</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** 写真が無いレシピ用。タイトルの1文字目を皿に描く */
function PlatePlaceholder({ title }: { title: string }) {
  const hue = Math.round(hash(title) * 360);
  return (
    <span className="absolute inset-0 grid place-items-center" style={{ background: `hsl(${hue} 45% 88%)` }}>
      <svg viewBox="0 0 120 90" className="h-[80%]" aria-hidden>
        <ellipse cx="60" cy="48" rx="50" ry="34" fill="#fff" stroke="rgba(0,0,0,0.1)" strokeWidth="2" />
        <ellipse cx="60" cy="48" rx="36" ry="23" fill={`hsl(${hue} 50% 70%)`} />
        <text x="60" y="57" textAnchor="middle" fontSize="26" fill="#fff" fontFamily="var(--font-hand)">
          {[...title][0]}
        </text>
      </svg>
    </span>
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
