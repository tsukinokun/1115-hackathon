"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { findByName, searchIngredients } from "@/lib/ingredients";
import type { Ingredient, PantryItem } from "@/lib/types";
import { IngredientIcon } from "@/app/_components/IngredientIcon";

type Props = {
  ingredients: Ingredient[];
  onAdd: (item: PantryItem) => void;
};

/**
 * 冷蔵庫の上に貼ったメモ型の検索欄。
 * マスタから探してまな板へ。見つからなければ、打った名前のまま冷蔵庫に入れられる。
 */
export function PantrySearch({ ingredients, onAdd }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const listId = useId();

  const hits = useMemo(() => searchIngredients(ingredients, q), [ingredients, q]);
  const exact = q.trim() ? findByName(ingredients, q) : undefined;

  const add = (item: PantryItem) => {
    onAdd(item);
    setQ("");
    setOpen(false);
  };

  const submit = () => {
    const name = q.trim();
    if (!name) return;
    add(exact ? { ingredientId: exact.id, name: exact.name, category: exact.category } : { name, category: "other" });
  };

  return (
    <div className="relative">
      <motion.form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="relative flex items-center gap-1.5 rounded-[3px_5px_3px_4px] bg-[#fff8ea] py-1 pl-6 pr-1 shadow-[1px_3px_5px_rgba(60,40,20,0.15)]"
        initial={{ opacity: 0, y: -10, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: -1.2 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 18 }}
      >
        <span className="absolute -left-1 -top-1.5 h-4 w-4 rounded-full bg-[#ff6b4a] shadow-[0_2px_0_rgba(0,0,0,0.25)]" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="ほかにある？ ゴーヤ、大葉…"
          aria-label="冷蔵庫の食材をさがす・足す"
          aria-controls={listId}
          className="font-hand min-w-0 flex-1 bg-transparent py-1 text-[0.85rem] text-ink outline-none placeholder:text-ink/35"
          enterKeyHint="done"
        />
        <button
          type="submit"
          disabled={!q.trim()}
          className="font-hand shrink-0 rounded-full bg-ink px-2.5 py-1 text-[0.7rem] text-white transition-opacity disabled:opacity-25"
        >
          入れる
        </button>
      </motion.form>

      <AnimatePresence>
        {open && q.trim() && (
          <motion.ul
            id={listId}
            role="listbox"
            className="absolute inset-x-1 top-full z-40 mt-1 overflow-hidden rounded-[4px_10px_10px_10px] border-2 border-ink/80 bg-white py-1 shadow-[3px_4px_0_rgba(58,47,42,0.6)]"
            initial={{ opacity: 0, y: -6, scaleY: 0.8 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6 }}
            style={{ originY: 0 }}
          >
            {hits.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add({ ingredientId: i.id, name: i.name, category: i.category })}
                  className="flex w-full items-center gap-2 px-2 py-1 text-left text-[0.8rem] hover:bg-[#fff1c2]"
                >
                  <IngredientIcon name={i.name} category={i.category} image={i.image} size={26} />
                  {i.name}
                </button>
              </li>
            ))}
            {!exact && (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={submit}
                  className="font-hand flex w-full items-center gap-2 border-t border-dashed border-ink/20 px-2 py-1.5 text-left text-[0.8rem] text-[var(--tomato)] hover:bg-[#fff1c2]"
                >
                  <span className="grid h-[26px] w-[26px] place-items-center rounded-full border-2 border-dashed border-current text-sm">＋</span>
                  「{q.trim()}」を冷蔵庫に入れる
                </button>
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
