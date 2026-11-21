"use client";

import { AnimatePresence, motion } from "motion/react";
import { hash, jitter } from "@/lib/jitter";
import type { Recipe } from "@/lib/types";
import { Photo } from "../Photo";

// レシピの見せ方の部品。診断結果のレシート（RecipeCard）とレシピページ（/recipes/[id]）で共通。

export type Zoomed = { url: string; caption?: string; id: string } | null;

/** ポラロイド風に貼った完成写真。無ければ皿のイラスト */
export function Cover({ recipe, onZoom }: { recipe: Recipe; onZoom: (z: Zoomed) => void }) {
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
export function Gallery({ recipe, photos, onZoom }: { recipe: Recipe; photos: Recipe["photos"]; onZoom: (z: Zoomed) => void }) {
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

/** 材料。have に入っている名前には ✔ を付ける（診断で手持ちと一致したもの） */
export function IngredientsList({ recipe, have = [] }: { recipe: Recipe; have?: string[] }) {
  return (
    <>
      <h3 className="mt-5 text-xs font-bold">
        材料 <span className="font-normal text-ink/50">（{recipe.servings}人分）</span>
      </h3>
      <ul className="mt-1.5 space-y-1 text-[0.8rem]">
        {recipe.ingredients.map((ing, i) => {
          const ok = have.includes(ing.name);
          return (
            <li key={`${ing.name}-${i}`} className="flex items-baseline gap-2">
              <span className={`w-4 shrink-0 text-center ${ok ? "text-[#3d9a5f]" : "text-ink/25"}`}>{ok ? "✔" : "・"}</span>
              <span>{ing.name}</span>
              <span className="min-w-4 flex-1 border-b border-dotted border-ink/20" />
              <span className="text-ink/60">{ing.amount}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** つくりかた。写真付きの工程はサムネイル（タップで拡大） */
export function StepsList({ recipe, onZoom }: { recipe: Recipe; onZoom: (z: Zoomed) => void }) {
  return (
    <>
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
                  onClick={() => onZoom({ url: s.image!, caption: `工程 ${i + 1}`, id: `step-${recipe.id}-${i}` })}
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
    </>
  );
}

export function Lightbox({ zoomed, onClose }: { zoomed: Zoomed; onClose: () => void }) {
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
export function PlatePlaceholder({ title }: { title: string }) {
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
