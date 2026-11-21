"use client";

import { AnimatePresence, motion } from "motion/react";
import { jitter } from "@/lib/jitter";
import type { FridgeItem } from "./FridgeShelves";
import { IngredientIcon } from "@/app/_components/IngredientIcon";

type Props = {
  ref: React.Ref<HTMLDivElement>;
  items: FridgeItem[];
  onRemove: (item: FridgeItem) => void;
  onCook: () => void;
};

/** 何個のっても溢れないよう、重ねて置く。のりきらない分は「+n」 */
const MAX_VISIBLE = 9;

export function CuttingBoard({ ref, items, onRemove, onCook }: Props) {
  const visible = items.slice(-MAX_VISIBLE);
  const hidden = items.length - visible.length;

  return (
    <motion.div
      className="relative mt-5 flex w-full shrink-0 items-end gap-2"
      initial={{ opacity: 0, y: 80 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 80 }}
      transition={{ type: "spring", stiffness: 180, damping: 20, delay: 0.25 }}
    >
      <div
        ref={ref}
        className="cutting-board relative h-[118px] flex-1 -rotate-2 rounded-[22px_16px_26px_14px] transition-[filter,scale] data-[hover=1]:scale-[1.03] data-[hover=1]:brightness-110"
        aria-label={`まな板（${items.length}品）`}
      >
        {/* 持ち手の穴 */}
        <span className="absolute right-3 top-1/2 h-4 w-7 -translate-y-1/2 rounded-full bg-[rgba(90,55,25,0.35)] shadow-[inset_0_2px_2px_rgba(0,0,0,0.25)]" />

        {items.length === 0 && (
          <motion.p
            className="font-hand absolute inset-0 grid place-items-center pr-10 text-center text-sm leading-snug text-[#6b4423]/70"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            下にひっぱって、ここへ
            <br />
            （タップでもOK）
          </motion.p>
        )}

        <div className="absolute inset-y-2 left-3 right-12 flex flex-wrap content-center items-center">
          <AnimatePresence>
            {visible.map((item) => (
              <motion.button
                type="button"
                layout
                key={item.key}
                onClick={() => onRemove(item)}
                aria-label={`${item.name}を冷蔵庫に戻す`}
                className="-mr-2.5 -my-1"
                initial={{ scale: 0, y: -50, rotate: -40 }}
                animate={{ scale: 1, y: jitter(item.key + "by", -3, 3), rotate: jitter(item.key + "br", -22, 22) }}
                exit={{ scale: 0, y: -40, opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 16 }}
                whileHover={{ scale: 1.1, zIndex: 5 }}
              >
                <IngredientIcon name={item.name} category={item.category} image={item.image} size={44} />
              </motion.button>
            ))}
          </AnimatePresence>
          {hidden > 0 && (
            <span className="font-hand ml-3 rotate-6 rounded-full bg-white/80 px-1.5 text-xs text-ink">+{hidden}</span>
          )}
        </div>
      </div>

      <motion.button
        type="button"
        onClick={onCook}
        className="relative mb-2 shrink-0 rotate-3 rounded-[16px_10px_18px_8px] bg-[var(--tomato)] px-3.5 py-3 text-center text-white shadow-[3px_4px_0_var(--ink)]"
        whileHover={{ rotate: -2, y: -2 }}
        whileTap={{ scale: 0.94, x: 2, y: 3, boxShadow: "0px 1px 0 var(--ink)" }}
        animate={items.length > 0 ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={items.length > 0 ? { scale: { duration: 1.6, repeat: Infinity } } : undefined}
      >
        <span className="block text-xl leading-none" aria-hidden>
          🍳
        </span>
        <span className="font-hand block text-[0.82rem] leading-tight">
          {items.length > 0 ? (
            <>
              これで
              <br />
              作る！
            </>
          ) : (
            <>
              なにも
              <br />
              ないけど…
            </>
          )}
        </span>
      </motion.button>
    </motion.div>
  );
}
