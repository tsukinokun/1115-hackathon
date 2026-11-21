"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { CountryChips } from "@/app/_components/CountryChips";
import type { SubmitResult } from "../_lib/submitRecipe";

type Props = { result: Extract<SubmitResult, { ok: true }>; onAgain: () => void };

/** 投稿後。メモが冷蔵庫の扉に飛んできて、マグネットで留まる */
export function PostedNote({ result, onAgain }: Props) {
  const { input } = result;
  return (
    <motion.div className="relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* 冷蔵庫の扉 */}
      <div className="fridge-door relative mx-auto min-h-[420px] rounded-[18px_22px_12px_14px] p-6">
        <span className="absolute right-3 top-[12%] h-[34%] w-[9px] rounded-full bg-[var(--chrome)] shadow-[1px_2px_0_rgba(0,0,0,0.18)]" aria-hidden />

        <motion.div
          className="relative mx-auto mt-6 w-[82%] bg-[#fff8ea] px-4 pb-5 pt-7 shadow-[2px_8px_14px_rgba(60,40,20,0.2)]"
          initial={{ y: 380, scale: 1.6, rotate: -25, opacity: 0 }}
          animate={{ y: 0, scale: 1, rotate: [-25, 4, -2.5], opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 120,
            damping: 13,
            delay: 0.1,
            // 3点キーフレームは spring で扱えないので回転だけ tween
            rotate: { duration: 0.9, delay: 0.1, times: [0, 0.6, 1], ease: "easeOut" },
          }}
        >
          {/* マグネットが落ちてきて留める */}
          <motion.span
            className="absolute -top-3 left-1/2 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full bg-[#ff6b4a] shadow-[0_3px_0_rgba(0,0,0,0.25)]"
            initial={{ y: -120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.75, type: "spring", stiffness: 500, damping: 14 }}
            aria-hidden
          />
          <p className="text-[0.68rem] text-ink/50">{input.catch ?? "あたらしいレシピ"}</p>
          <h2 className="font-hand mt-0.5 text-[1.6rem] leading-tight text-ink">{input.title}</h2>
          <p className="mt-2 text-[0.72rem] text-ink/60">
            材料 {input.ingredients.length}つ・{input.steps.length}工程・{input.minutes}分
          </p>
          <CountryChips tags={input.tags} className="mt-1.5" />

          <motion.span
            className="font-hand absolute -right-3 bottom-3 rounded-full border-[3px] border-[#c0392b] px-2 py-0.5 text-lg text-[#c0392b] mix-blend-multiply"
            initial={{ scale: 2, opacity: 0, rotate: -30 }}
            animate={{ scale: 1, opacity: 0.9, rotate: -12 }}
            transition={{ delay: 1.1, type: "spring", stiffness: 600, damping: 15 }}
          >
            貼ったよ！
          </motion.span>
        </motion.div>

        <motion.p
          className="mx-auto mt-8 max-w-[18rem] text-center text-[0.72rem] leading-relaxed text-ink/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          role="status"
        >
          {result.mode === "local"
            ? "いまはこの端末にだけ仮保存しています。バックエンドにつながったら、みんなの冷蔵庫に本当に貼られます。"
            : "みんなの冷蔵庫に貼りました。だれかの「すき」になりますように。"}
        </motion.p>
      </div>

      <motion.div
        className="mt-6 flex flex-wrap items-center justify-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
      >
        <Link
          href="/diagnosis"
          className="font-hand rotate-1 rounded-[16px_10px_18px_8px] bg-[var(--tomato)] px-5 py-2.5 text-white shadow-[3px_4px_0_var(--ink)]"
        >
          🧊 診断してみる
        </Link>
        <button
          type="button"
          onClick={onAgain}
          className="font-hand -rotate-2 rounded-full border-2 border-ink px-4 py-2 text-sm shadow-[2px_3px_0_var(--ink)]"
        >
          もう1枚書く
        </button>
      </motion.div>
    </motion.div>
  );
}
