"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { jitter } from "@/lib/jitter";

export type FaceMood = "smile" | "cold" | "excited" | "happy" | "pout";

type Props = {
  mood: FaceMood;
  /** いましゃべっている台詞。変わるたびに、文字数ぶん口をパクパクさせる */
  line?: string;
  className?: string;
};

const INK = "var(--ink)";
/** 左右の目。わざと少しだけ高さと大きさをずらして、手で描いた感じにする */
const EYES = [
  { x: 27, y: 13.5, s: 1 },
  { x: 53, y: 12.5, s: 1.08 },
] as const;

/** 冷蔵庫くんの顔。冷凍室の扉に描いてある */
export function FridgeFace({ mood, line = "", className = "" }: Props) {
  const talking = useTalking(line);

  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 80 36"
      className={className}
      animate={mood === "excited" ? { y: [0, -1.5, 0] } : { y: 0 }}
      transition={mood === "excited" ? { duration: 0.3, repeat: Infinity } : { duration: 0.2 }}
    >
      {/* ほっぺ */}
      <ellipse cx="16" cy="22" rx="5.5" ry="3.2" fill="#ff9aa8" opacity={mood === "pout" ? 0.85 : 0.5} />
      <ellipse cx="64.5" cy="21" rx="5.5" ry="3.2" fill="#ff9aa8" opacity={mood === "pout" ? 0.85 : 0.5} />

      {EYES.map((e, i) => (
        <Eye key={i} {...e} mood={mood} seed={`eye-${i}`} flip={i === 1} />
      ))}

      {talking ? <TalkingMouth /> : <Mouth mood={mood} />}
    </motion.svg>
  );
}

/** 台詞が変わってから「文字数 × 70ms」のあいだ true */
function useTalking(line: string) {
  const [doneLine, setDoneLine] = useState<string | null>(null);
  useEffect(() => {
    if (!line) return;
    const t = setTimeout(() => setDoneLine(line), Math.min(3000, line.length * 70));
    return () => clearTimeout(t);
  }, [line]);
  return !!line && doneLine !== line;
}

function Eye({ x, y, s, mood, seed, flip }: { x: number; y: number; s: number; mood: FaceMood; seed: string; flip: boolean }) {
  if (mood === "excited") {
    // ＞ ＜
    const d = flip ? `M${x + 3.5} ${y - 3.5} L${x - 3} ${y} L${x + 3.5} ${y + 3.5}` : `M${x - 3.5} ${y - 3.5} L${x + 3} ${y} L${x - 3.5} ${y + 3.5}`;
    return <path d={d} stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
  }
  if (mood === "happy") {
    // ^ ^
    return <path d={`M${x - 4} ${y + 2} Q${x} ${y - 4.5} ${x + 4} ${y + 2}`} stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />;
  }

  const r = mood === "cold" ? 4.2 * s : 3.3 * s;
  return (
    <g>
      {/* まばたき。間隔は目ごとに固定でずらす */}
      <motion.g
        style={{ transformBox: "fill-box", originY: 0.5 }}
        animate={{ scaleY: [1, 1, 0.1, 1] }}
        transition={{ duration: 0.25, times: [0, 0.4, 0.6, 1], repeat: Infinity, repeatDelay: jitter("blink", 3.6, 5.4) }}
      >
        <ellipse cx={x} cy={y} rx={r} ry={mood === "pout" ? r * 0.7 : r * 1.15} fill={INK} />
        <circle cx={x + r * 0.35} cy={y - r * 0.45} r={r * 0.32} fill="#fff" />
      </motion.g>
      {mood === "pout" && (
        // むっとした眉
        <path
          d={flip ? `M${x - 4.5} ${y - 7.5} L${x + 4} ${y - 5.5}` : `M${x - 4} ${y - 5.5} L${x + 4.5} ${y - 7.5}`}
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
      {mood === "cold" && jitter(seed, 0, 1) > 0.5 && <path d={`M${x + 6} ${y - 7} q1.5 2 0 3.5`} stroke="#7fc4f0" strokeWidth="1.4" fill="none" strokeLinecap="round" />}
    </g>
  );
}

function Mouth({ mood }: { mood: FaceMood }) {
  switch (mood) {
    case "cold":
      // 「お」
      return <ellipse cx="40.5" cy="26" rx="3" ry="3.6" fill="none" stroke={INK} strokeWidth="2.2" />;
    case "excited":
      return <path d="M32.5 22.5 Q40 32 48 22 Z" fill="#c0392b" stroke={INK} strokeWidth="2" strokeLinejoin="round" />;
    case "happy":
      return (
        <g>
          <path d="M30 21.5 Q40 35 50.5 21 Z" fill="#c0392b" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M35.5 28.5 Q40.5 26 45 28.3" fill="#ff8f8f" />
        </g>
      );
    case "pout":
      return <path d="M35 28 Q40 24.5 45.5 27.5" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />;
    default:
      return <path d="M33 23.5 Q40 30.5 47.5 23" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />;
  }
}

/** しゃべっている口。パクパク */
function TalkingMouth() {
  return (
    <motion.ellipse
      cx="40.3"
      cy="25.5"
      rx="4"
      fill="#c0392b"
      stroke={INK}
      strokeWidth="2"
      initial={{ ry: 1.2 }}
      animate={{ ry: [1.2, 3.8, 1.2] }}
      transition={{ duration: 0.22, repeat: Infinity }}
    />
  );
}
