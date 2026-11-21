"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { jitter, pick } from "@/lib/jitter";
import type { Answers, Option, Question } from "@/lib/types";
import { Photo } from "@/app/_components/Photo";

const NOTE_COLORS = ["#ffe27a", "#ffc2cf", "#bfe3ff", "#d3f2b0", "#fff8ea"];
const MAGNET_COLORS = ["#ff6b4a", "#3c8dde", "#f2b134", "#59b37a", "#a46be0", "#ff8fb1"];

type Props = {
  questions: Question[];
  answers: Answers;
  onAnswer: (questionId: string, optionId: string) => void;
};

export function DoorNotes({ questions, answers, onAnswer }: Props) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  const pending = questions.filter((q) => !answers[q.id]?.length);
  const answered = questions.filter((q) => answers[q.id]?.length);
  const active = questions.find((q) => q.id === focusId) ?? pending[0];
  const rest = pending.filter((q) => q.id !== active?.id);

  const choose = (q: Question, optionId: string) => {
    if (chosen) return;
    setChosen(optionId);
    // マグネットが「カチッ」とくっつくのを見せてから剥がす
    setTimeout(() => {
      onAnswer(q.id, optionId);
      setChosen(null);
      setFocusId(null);
    }, 320);
  };

  return (
    <div className="absolute inset-0 overflow-clip rounded-[inherit] pr-9">
      {/* 上の方に貼られた、まだ答えていないメモ */}
      <div className="relative h-[23%] min-h-[96px]">
        <AnimatePresence>
          {rest.map((q, i) => (
            <SmallNote
              key={q.id}
              q={q}
              index={i}
              total={rest.length}
              onClick={() => setFocusId(q.id)}
            />
          ))}
        </AnimatePresence>
        {pending.length > 0 && (
          <span className="font-hand absolute bottom-0 right-1 rotate-[-5deg] text-[0.7rem] text-ink/55">
            のこり {pending.length} 枚
          </span>
        )}
      </div>

      {/* いま答えるメモ */}
      <div className="relative flex h-[57%] items-center justify-center">
        <AnimatePresence mode="popLayout">
          {active ? (
            <ActiveNote key={active.id} q={active} chosen={chosen} onChoose={(oid) => choose(active, oid)} />
          ) : (
            <DoneNote key="done" />
          )}
        </AnimatePresence>
      </div>

      {/* 答えたマグネットのコレクション。タップで答え直し */}
      <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-end gap-x-1 gap-y-1.5 pr-8">
        <AnimatePresence>
          {answered.map((q) => {
            const opt = q.options.find((o) => o.id === answers[q.id][0]);
            if (!opt) return null;
            return (
              <motion.button
                type="button"
                key={q.id}
                layout
                initial={{ scale: 0, y: -60, rotate: -30 }}
                animate={{ scale: 1, y: 0, rotate: jitter(q.id + "r", -14, 14) }}
                exit={{ scale: 0 }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 380, damping: 16 }}
                onClick={() => setFocusId(q.id)}
                title={`${q.text}：${opt.label}（タップで書き直す）`}
                className="flex h-9 items-center gap-1 rounded-full pl-1.5 pr-2.5 text-[0.65rem] font-bold text-white shadow-[0_3px_0_rgba(0,0,0,0.2)]"
                style={{ background: pick(q.id, MAGNET_COLORS) }}
              >
                <OptionBadge option={opt} size={24} />
                {opt.label}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SmallNote({ q, index, total, onClick }: { q: Question; index: number; total: number; onClick: () => void }) {
  const base = jitter(q.id, -9, 9);
  // 2段にずらして貼る（きっちり揃えない）
  const cols = Math.max(Math.ceil(total / 2), 1);
  const lower = index % 2 === 1;
  const left = 3 + (Math.floor(index / 2) / cols) * 72 + (lower ? 11 : 0) + jitter(q.id + "x", -3, 3);
  const top = lower ? jitter(q.id + "y", 44, 54) : jitter(q.id + "y", 4, 14);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={`${q.text} のメモを開く`}
      className="absolute w-[3.6rem] px-1 pb-1.5 pt-2 text-left shadow-[1px_3px_4px_rgba(0,0,0,0.12)]"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        background: pick(q.id, NOTE_COLORS),
        borderRadius: pick(q.id + "br", ["2px 2px 2px 10px", "2px", "8px 2px 2px 2px"]),
      }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1, rotate: [base, base + 2.5, base - 1.5, base] }}
      exit={{ opacity: 0, scale: 1.6, y: 120 }}
      whileHover={{ y: -4 }}
      transition={{
        rotate: { duration: jitter(q.id + "d", 2.8, 4.6), repeat: Infinity, ease: "easeInOut", delay: index * 0.3 },
        default: { type: "spring", stiffness: 260, damping: 20 },
      }}
    >
      <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#e74c3c] shadow-[0_1px_0_rgba(0,0,0,0.3)]" />
      <span className="font-hand line-clamp-2 block text-[0.55rem] leading-tight text-ink/80">{q.text}</span>
    </motion.button>
  );
}

function ActiveNote({ q, chosen, onChoose }: { q: Question; chosen: string | null; onChoose: (id: string) => void }) {
  const base = jitter(q.id + "big", -4, 3.5);
  const color = pick(q.id, NOTE_COLORS);
  const folded = q.id.length % 3 === 0;
  const isMagnetBoard = q.kind === "condition";

  return (
    <motion.div
      className="relative w-[90%] px-4 pb-4 pt-6 shadow-[2px_6px_10px_rgba(60,40,20,0.18)]"
      style={{
        background: color,
        borderRadius: folded ? "3px 3px 26px 3px" : "3px 6px 3px 4px",
      }}
      initial={{ opacity: 0, y: -80, scale: 0.6, rotate: base - 18 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: [base, base + 0.9, base] }}
      exit={{ opacity: 0, y: 360, rotate: base + jitter(q.id + "fall", -40, 40), transition: { duration: 0.7, ease: [0.5, 0, 0.9, 0.5] } }}
      transition={{
        rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" },
        default: { type: "spring", stiffness: 200, damping: 17 },
      }}
    >
      {/* 留めているマグネット or テープ */}
      {isMagnetBoard ? (
        <span className="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full bg-[#3c8dde] shadow-[0_2px_0_rgba(0,0,0,0.25)]" />
      ) : (
        <span
          className="absolute -top-2.5 left-[30%] h-5 w-16 bg-white/55 shadow-sm"
          style={{ rotate: `${jitter(q.id + "tape", -12, 8)}deg` }}
        />
      )}
      {folded && (
        <span className="absolute bottom-0 right-0 h-6 w-6 rounded-tl-[14px] bg-black/10" aria-hidden />
      )}

      <p className="font-hand text-[1.45rem] leading-tight text-ink">{q.text}</p>
      {q.note && <p className="mt-0.5 text-[0.68rem] text-ink/55">― {q.note}</p>}

      <div className="mt-4 flex flex-wrap gap-x-2 gap-y-2.5">
        {q.options.map((o, i) => {
          const isChosen = chosen === o.id;
          const dim = chosen && !isChosen;
          return (
            <motion.button
              type="button"
              key={o.id}
              onClick={() => onChoose(o.id)}
              className="flex items-center gap-1.5 rounded-full border-2 border-ink/80 bg-white/80 py-1 pl-1 pr-3 text-[0.8rem] font-bold text-ink"
              style={{ marginTop: jitter(o.id + q.id, 0, 6) }}
              initial={{ opacity: 0, y: 10, rotate: 0 }}
              animate={{
                opacity: dim ? 0.35 : 1,
                y: 0,
                rotate: jitter(o.id, -5, 5),
                scale: isChosen ? [1, 1.25, 1.08] : 1,
                backgroundColor: isChosen ? pick(o.id, MAGNET_COLORS) : "rgba(255,255,255,0.8)",
                color: isChosen ? "#fff" : "var(--ink)",
              }}
              whileHover={{ y: -3, rotate: 0 }}
              whileTap={{ scale: 0.92 }}
              transition={{
                delay: chosen ? 0 : 0.15 + i * 0.06,
                type: "spring",
                stiffness: 320,
                damping: 18,
                // 3点キーフレームは spring では扱えないので tween にする
                scale: { duration: 0.3, ease: "easeOut" },
              }}
            >
              <OptionBadge option={o} size={28} />
              {o.label}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

/** 選択肢の丸い頭。投稿された選択肢は 写真 → 絵文字 → 色だけ の順で見せる */
function OptionBadge({ option, size }: { option: Option; size: number }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)]"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {option.image ? (
        <Photo src={option.image} alt="" sizes={`${size}px`} />
      ) : option.emoji ? (
        option.emoji
      ) : (
        <span className="h-1/2 w-1/2 rounded-full" style={{ background: pick(option.id + "dot", MAGNET_COLORS) }} />
      )}
    </span>
  );
}

function DoneNote() {
  return (
    <motion.div
      className="relative w-[78%] rotate-[3deg] bg-[#fff8ea] px-4 py-5 shadow-[2px_6px_10px_rgba(60,40,20,0.15)]"
      initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
      animate={{ opacity: 1, scale: 1, rotate: 3 }}
      transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.3 }}
    >
      <p className="font-hand text-xl leading-snug text-ink">
        ぜんぶ書けた！
        <br />
        あとは、中身を見せて。
      </p>
      <motion.svg
        viewBox="0 0 80 40"
        className="absolute -right-6 top-1/2 w-16"
        aria-hidden
        animate={{ x: [0, 4, 0] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        <motion.path
          d="M2 30 C 25 34, 50 28, 70 10 M60 8 L71 9 L69 20"
          fill="none"
          stroke="var(--tomato)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />
      </motion.svg>
    </motion.div>
  );
}
