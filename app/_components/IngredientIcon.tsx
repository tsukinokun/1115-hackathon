"use client";

import { hash } from "@/lib/jitter";
import type { IngredientCategory } from "@/lib/types";
import { Photo } from "./Photo";

type Props = {
  name: string;
  category?: IngredientCategory;
  image?: string | null;
  size?: number;
};

/**
 * どんな食材でも絵になるアイコン。
 * 写真があれば写真、無ければカテゴリごとの「容器」に手書きラベルを貼ったイラストを自動で描く。
 */
export function IngredientIcon({ name, category = "other", image, size = 58 }: Props) {
  if (image) {
    return (
      <span className="relative block" style={{ width: size, height: size * 1.1 }}>
        <span className="absolute inset-x-0 top-0 overflow-hidden rounded-[10px_12px_9px_11px] bg-white shadow-[0_2px_4px_rgba(0,0,0,0.15)]" style={{ height: size }}>
          <Photo src={image} alt={name} sizes={`${size}px`} />
        </span>
        <Label name={name} size={size} />
      </span>
    );
  }

  const h = hash(name);
  const tone = TONES[category];
  const hue = tone.hue + (h - 0.5) * 24;
  const body = `hsl(${hue} ${tone.sat}% ${tone.light + (h - 0.5) * 8}%)`;
  const dark = `hsl(${hue} ${tone.sat}% ${tone.light - 22}%)`;
  const Shape = SHAPES[category];

  return (
    <span className="relative block" style={{ width: size, height: size * 1.1 }}>
      <svg viewBox="0 0 60 66" width={size} height={size * 1.1} aria-hidden className="overflow-visible">
        <ellipse cx="30" cy="63" rx="20" ry="2.6" fill="rgba(0,0,0,0.12)" />
        <Shape body={body} dark={dark} />
      </svg>
      <Label name={name} size={size} />
    </span>
  );
}

/** 容器に貼った養生テープ風のラベル。長い名前は詰めて、さらに長ければ省略 */
function Label({ name, size }: { name: string; size: number }) {
  const short = [...name].length > 7 ? [...name].slice(0, 6).join("") + "…" : name;
  const len = [...short].length;
  const fs = len <= 2 ? 0.25 : len <= 3 ? 0.22 : len <= 4 ? 0.19 : 0.16;
  const tilt = (hash(name + "t") - 0.5) * 10;
  return (
    <span
      className="font-hand absolute left-1/2 top-[50%] max-w-[96%] -translate-x-1/2 truncate whitespace-nowrap rounded-[2px] bg-[#fffdf3]/95 px-1 leading-[1.35] text-ink shadow-[0_1px_1px_rgba(0,0,0,0.15)]"
      style={{ fontSize: size * fs, rotate: `${tilt}deg` }}
      title={name}
    >
      {short}
    </span>
  );
}

const TONES: Record<IngredientCategory, { hue: number; sat: number; light: number }> = {
  vegetable: { hue: 105, sat: 45, light: 62 },
  meat: { hue: 355, sat: 55, light: 78 },
  fish: { hue: 20, sat: 70, light: 74 },
  egg_dairy: { hue: 205, sat: 55, light: 82 },
  soy: { hue: 45, sat: 35, light: 88 },
  grain: { hue: 35, sat: 45, light: 80 },
  seasoning: { hue: 15, sat: 55, light: 55 },
  other: { hue: 280, sat: 30, light: 78 },
};

type ShapeProps = { body: string; dark: string };

/** 野菜: 口をねじった紙袋 */
const Bag = ({ body, dark }: ShapeProps) => (
  <>
    <path d="M14 22 Q 12 52 16 60 L 44 60 Q 48 52 46 22 Z" fill={body} stroke={dark} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M18 22 Q 24 12 30 16 Q 36 10 42 22" fill={body} stroke={dark} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M26 15 Q 30 8 34 14" fill="none" stroke={dark} strokeWidth="2" strokeLinecap="round" />
    <path d="M19 30 Q 20 44 21 55" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
  </>
);

/** 肉・魚: ラップのかかったトレーパック */
const Tray = ({ body, dark }: ShapeProps) => (
  <>
    <path d="M6 38 L 54 38 L 50 58 L 10 58 Z" fill="#fbfbf7" stroke="#cfcfc6" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M12 40 Q 20 26 32 30 Q 46 24 49 40 Z" fill={body} stroke={dark} strokeWidth="1.3" />
    <path d="M18 36 Q 26 30 34 34 M 30 38 Q 38 31 44 36" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M8 38 Q 30 30 52 38" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2" />
  </>
);

/** 卵・乳製品: 紙パック */
const Carton = ({ body, dark }: ShapeProps) => (
  <>
    <path d="M18 22 L 42 22 L 42 60 L 18 60 Z" fill={body} stroke={dark} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M18 22 L 24 10 L 36 10 L 42 22 Z" fill="#fff" stroke={dark} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M24 10 L 36 10 L 36 6 L 24 6 Z" fill="#fff" stroke={dark} strokeWidth="1.3" />
    <path d="M18 52 L 42 52" stroke="rgba(255,255,255,0.7)" strokeWidth="3" />
  </>
);

/** 大豆製品: 水の張ったパック */
const SoyPack = ({ body, dark }: ShapeProps) => (
  <>
    <path d="M8 28 L 52 28 L 49 58 L 11 58 Z" fill="rgba(200,230,245,0.75)" stroke="#a9cbe0" strokeWidth="1.5" strokeLinejoin="round" />
    <rect x="15" y="31" width="30" height="24" rx="3" fill={body} stroke={dark} strokeWidth="1.2" />
    <path d="M10 36 Q 20 33 30 36 T 50 36" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.3" />
  </>
);

/** 穀物: ふた付き保存容器 */
const Box = ({ body, dark }: ShapeProps) => (
  <>
    <rect x="9" y="26" width="42" height="33" rx="5" fill="rgba(255,255,255,0.75)" stroke="#c9c2b4" strokeWidth="1.5" />
    <path d="M12 40 Q 20 32 30 36 Q 40 31 48 40 L 48 56 L 12 56 Z" fill={body} stroke={dark} strokeWidth="1" />
    <rect x="7" y="21" width="46" height="7" rx="3" fill={dark} />
  </>
);

/** 調味料: 背の高いボトル */
const Bottle = ({ body, dark }: ShapeProps) => (
  <>
    <path d="M24 6 L 36 6 L 36 14 Q 44 20 44 30 L 44 60 L 16 60 L 16 30 Q 16 20 24 14 Z" fill={body} stroke={dark} strokeWidth="1.5" strokeLinejoin="round" />
    <rect x="23" y="2" width="14" height="7" rx="2" fill={dark} />
    <path d="M20 30 L 20 54" stroke="rgba(255,255,255,0.45)" strokeWidth="2.4" strokeLinecap="round" />
  </>
);

/** その他: 保存瓶 */
const Jar = ({ body, dark }: ShapeProps) => (
  <>
    <path d="M14 20 L 46 20 Q 50 22 50 30 L 50 56 Q 50 60 46 60 L 14 60 Q 10 60 10 56 L 10 30 Q 10 22 14 20 Z" fill={body} stroke={dark} strokeWidth="1.5" />
    <rect x="13" y="12" width="34" height="9" rx="2.5" fill={dark} />
    <path d="M15 28 L 15 52" stroke="rgba(255,255,255,0.5)" strokeWidth="2.4" strokeLinecap="round" />
  </>
);

const SHAPES: Record<IngredientCategory, (p: ShapeProps) => React.ReactNode> = {
  vegetable: Bag,
  meat: Tray,
  fish: Tray,
  egg_dairy: Carton,
  soy: SoyPack,
  grain: Box,
  seasoning: Bottle,
  other: Jar,
};
