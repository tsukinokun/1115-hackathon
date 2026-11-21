"use client";

import { motion } from "motion/react";
import { jitter, pick } from "@/lib/jitter";
import type { Question } from "@/lib/types";
import type { MoodPicks } from "../_lib/tags";
import { Tape } from "./bits";

const NOTE_COLORS = ["#ffe27a", "#ffc2cf", "#bfe3ff", "#d3f2b0", "#fff8ea"];
const MAGNET_COLORS = ["#ff6b4a", "#3c8dde", "#f2b134", "#59b37a", "#a46be0", "#ff8fb1"];

type Props = {
  questions: Question[];
  picks: MoodPicks;
  onToggle: (questionId: string, optionId: string) => void;
};

/**
 * 「どんな気分のとき食べたい？」
 * 診断の質問をそのまま小さなメモにして並べ、当てはまる選択肢のマグネットを（いくつでも）付ける。
 * 選んだ選択肢のタグがそのままレシピのタグになるので、診断で出やすくなる。
 */
export function MoodMagnets({ questions, picks, onToggle }: Props) {
  const chosen = questions.flatMap((q) => q.options.filter((o) => picks[q.id]?.includes(o.id)).map((o) => o.label));

  return (
    <section aria-labelledby="h-moods" className="relative">
      <div id="h-moods">
        <Tape color="rgba(255,194,207,0.85)" tilt={-1.5}>
          どんな気分のとき食べたい？
        </Tape>
      </div>
      <p className="mt-1.5 text-[0.7rem] text-ink/55">当てはまるものにマグネットを。いくつでもOK。</p>

      <div className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-3.5">
        {questions.map((q, qi) => {
          const tilt = jitter(q.id + "post", -3, 3);
          return (
            <motion.fieldset
              key={q.id}
              className="relative min-w-0 px-2 pb-2 pt-3 shadow-[1px_3px_5px_rgba(60,40,20,0.12)]"
              style={{
                background: pick(q.id, NOTE_COLORS),
                borderRadius: pick(q.id + "br", ["2px 2px 2px 12px", "2px", "10px 2px 2px 2px"]),
                // 幅を少しずつ変えて、きれいに揃えすぎない
                marginTop: qi % 2 ? 10 : 0,
              }}
              initial={{ opacity: 0, y: 12, rotate: tilt - 6 }}
              whileInView={{ opacity: 1, y: 0, rotate: tilt }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ type: "spring", stiffness: 220, damping: 18, delay: (qi % 4) * 0.05 }}
            >
              <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-[#e74c3c] shadow-[0_1px_0_rgba(0,0,0,0.3)]" aria-hidden />
              <legend className="sr-only">{q.text}</legend>
              <p className="font-hand text-[0.78rem] leading-tight text-ink" aria-hidden>
                {q.text}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {q.options.map((o) => {
                  const on = !!picks[q.id]?.includes(o.id);
                  const color = pick(o.id + q.id, MAGNET_COLORS);
                  return (
                    <motion.button
                      type="button"
                      key={o.id}
                      aria-pressed={on}
                      onClick={() => onToggle(q.id, o.id)}
                      className="flex items-center gap-0.5 rounded-full border-[1.5px] px-1.5 py-0.5 text-[0.66rem] font-bold"
                      animate={{
                        backgroundColor: on ? color : "rgba(255,255,255,0.75)",
                        borderColor: on ? color : "rgba(58,47,42,0.35)",
                        color: on ? "#fff" : "#3a2f2a",
                        scale: on ? 1.06 : 1,
                        rotate: on ? jitter(o.id, -6, 6) : 0,
                        y: on ? -1 : 0,
                      }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    >
                      {o.emoji && <span aria-hidden>{o.emoji}</span>}
                      {o.label}
                    </motion.button>
                  );
                })}
              </div>
            </motion.fieldset>
          );
        })}
      </div>

      <motion.p className="mt-3 text-[0.72rem] leading-relaxed text-ink/70" layout>
        {chosen.length > 0 ? (
          <>
            診断で
            {chosen.slice(0, 6).map((l) => (
              <mark key={l} className="mx-0.5 rounded-sm bg-[#ffe27a]/70 px-1 text-ink">
                {l}
              </mark>
            ))}
            {chosen.length > 6 && `ほか${chosen.length - 6}つ`}
            な人に出やすくなるよ。
          </>
        ) : (
          "選ばなくても投稿できるけど、診断には出にくくなるよ。"
        )}
      </motion.p>
    </section>
  );
}
