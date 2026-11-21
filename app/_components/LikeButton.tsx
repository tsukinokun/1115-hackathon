"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { getMyLikes, reactionMode, toggleLike } from "@/lib/reactions/client";

type Props = {
  recipeId: string;
  /** サーバーで数えたスキ数（自分の分を含む） */
  count: number;
  size?: "sm" | "lg";
  className?: string;
};

const BURST = [-70, -35, 0, 35, 70, 110, -110];

/**
 * スキ（いいね）。冷蔵庫に貼るハートのマグネット。
 * 先に見た目を変えて（楽観的更新）、失敗したら戻して赤ペンで知らせる。
 */
export function LikeButton({ recipeId, count: initialCount, size = "lg", className = "" }: Props) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    let alive = true;
    getMyLikes().then((mine) => {
      if (!alive || !mine.has(recipeId)) return;
      setLiked(true);
      // 仮保存モードでは、サーバー（仮データ）の数に自分のスキが入っていないので足す
      if (reactionMode() === "local") setCount(initialCount + 1);
    });
    return () => {
      alive = false;
    };
  }, [recipeId, initialCount]);

  const press = async () => {
    if (pending) return;
    const before = { liked, count };
    setError(undefined);
    setLiked(!liked);
    setCount(Math.max(0, count + (liked ? -1 : 1)));
    if (!liked) setBurst((b) => b + 1);
    setPending(true);
    const res = await toggleLike(recipeId, before.liked, before.count);
    setPending(false);
    if (!res.ok) {
      setLiked(before.liked);
      setCount(before.count);
      setError(res.message);
      return;
    }
    setLiked(res.liked);
    setCount(res.count);
  };

  const big = size === "lg";
  const w = big ? 64 : 40;

  return (
    <span className={`relative inline-flex flex-col items-center ${className}`}>
      <motion.button
        type="button"
        onClick={press}
        aria-pressed={liked}
        aria-label={liked ? `スキを取り消す（いま${count}）` : `スキ！（いま${count}）`}
        className="relative grid place-items-center"
        style={{ width: w, height: w * 0.92 }}
        whileTap={{ scale: 0.85 }}
        animate={liked ? { scale: [1, 1.28, 0.95, 1], rotate: [0, -8, 4, -3] } : { scale: 1, rotate: -3 }}
        transition={{ duration: 0.45 }}
      >
        <svg viewBox="0 0 64 58" width={w} height={w * 0.92} aria-hidden className="drop-shadow-[0_3px_0_rgba(0,0,0,0.22)]">
          <path
            d="M32 54 C 10 40, 2 28, 4 17 C 6 6, 18 1, 26 6 C 29 8, 31 10, 32 13 C 33 10, 35 8, 38 6 C 46 1, 58 6, 60 17 C 62 28, 54 40, 32 54 Z"
            fill={liked ? "var(--tomato)" : "#fff8ea"}
            stroke={liked ? "#b8432c" : "var(--ink)"}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* マグネットのつや */}
          <path d="M14 14 Q 18 9 24 10" stroke="rgba(255,255,255,0.75)" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
        <span className={`font-hand absolute ${big ? "text-[0.8rem]" : "text-[0.55rem]"} ${liked ? "text-white" : "text-ink"}`} style={{ marginTop: -w * 0.08 }}>
          スキ
        </span>

        {/* 小さなハートが散る */}
        <AnimatePresence>
          {burst > 0 && liked && (
            <motion.span key={burst} className="pointer-events-none absolute inset-0" aria-hidden>
              {BURST.map((deg, i) => (
                <motion.span
                  key={deg}
                  className="absolute left-1/2 top-1/2 text-[var(--tomato)]"
                  style={{ fontSize: big ? 13 : 9 }}
                  initial={{ x: "-50%", y: "-50%", opacity: 1, scale: 0.4 }}
                  animate={{
                    x: `calc(-50% + ${Math.sin((deg * Math.PI) / 180) * w * 0.9}px)`,
                    y: `calc(-50% - ${Math.cos((deg * Math.PI) / 180) * w * 0.9}px)`,
                    opacity: 0,
                    scale: 1.1,
                    rotate: deg / 3,
                  }}
                  transition={{ duration: 0.7, delay: i * 0.02, ease: "easeOut" }}
                >
                  ♥
                </motion.span>
              ))}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence mode="popLayout">
        <motion.span
          key={count}
          className={`font-hand ${big ? "text-sm" : "text-[0.68rem]"} text-ink/70`}
          initial={{ y: liked ? 8 : -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: liked ? -8 : 8, opacity: 0 }}
          aria-hidden
        >
          {count}
        </motion.span>
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.span
            role="alert"
            className="font-hand absolute top-full mt-1 w-max max-w-[12rem] -rotate-2 text-center text-[0.7rem] text-[#d6362a]"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
