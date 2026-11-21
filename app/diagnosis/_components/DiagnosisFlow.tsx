"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { diagnose } from "@/lib/diagnose";
import { pantryKey, sortByPopularity } from "@/lib/ingredients";
import type { Answers, Ingredient, PantryItem, Question, Recipe, ReactionCounts } from "@/lib/types";
import { CookingTransition } from "./CookingTransition";
import { CuttingBoard } from "./CuttingBoard";
import { DoorNotes } from "./DoorNotes";
import { Fridge } from "./Fridge";
import { FridgeShelves, type FridgeItem } from "./FridgeShelves";
import { Kitchen } from "@/app/_components/Kitchen";
import { PantrySearch } from "./PantrySearch";
import { RecipeCard } from "./RecipeCard";

export type Phase = "door" | "inside" | "cooking" | "result";

type Props = {
  /** 扉に貼る質問（サーバー側で selectQuestions 済み） */
  questions: Question[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  /** レシピごとのスキ・コメント数 */
  counts: ReactionCounts;
};

const toItem = (p: PantryItem, master?: Ingredient): FridgeItem => ({
  key: pantryKey(p),
  ingredientId: p.ingredientId,
  name: master?.name ?? p.name,
  category: master?.category ?? p.category ?? "other",
  image: master?.image,
});

export function DiagnosisFlow({ questions, recipes, ingredients, counts }: Props) {
  const [phase, setPhase] = useState<Phase>("door");
  const [answers, setAnswers] = useState<Answers>({});
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  /** 検索で足した食材。マスタに無い自由入力もここに入る */
  const [added, setAdded] = useState<FridgeItem[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);

  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);

  // 冷蔵庫の中身: 最近足したもの → レシピでよく使われる順
  const stock = useMemo(() => {
    const addedKeys = new Set(added.map((a) => a.key));
    const master = sortByPopularity(ingredients, recipes)
      .map((i) => toItem({ ingredientId: i.id, name: i.name }, i))
      .filter((i) => !addedKeys.has(i.key));
    return [...added, ...master];
  }, [added, ingredients, recipes]);

  const pickedKeys = useMemo(() => new Set(pantry.map(pantryKey)), [pantry]);
  const picked = useMemo(() => {
    const byKey = new Map(stock.map((s) => [s.key, s]));
    return pantry.map((p) => byKey.get(pantryKey(p)) ?? toItem(p));
  }, [pantry, stock]);

  const doorDone = questions.every((q) => answers[q.id]?.length);

  const results = useMemo(
    () => (phase === "result" ? diagnose(questions, answers, pantry, recipes, ingredients) : []),
    [phase, questions, answers, pantry, recipes, ingredients],
  );

  // 調理中の演出が終わったら結果へ
  useEffect(() => {
    if (phase !== "cooking") return;
    const t = setTimeout(() => setPhase("result"), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  const answer = (qid: string, oid: string) => setAnswers((a) => ({ ...a, [qid]: [oid] }));

  const setPicked = (item: FridgeItem, on?: boolean) =>
    setPantry((cur) => {
      const has = cur.some((p) => pantryKey(p) === item.key);
      const next = on ?? !has;
      if (next === has) return cur;
      return next
        ? [...cur, { ingredientId: item.ingredientId, name: item.name, category: item.category }]
        : cur.filter((p) => pantryKey(p) !== item.key);
    });

  const addFromSearch = (p: PantryItem) => {
    const item = toItem(p, p.ingredientId ? byId.get(p.ingredientId) : undefined);
    setAdded((cur) => [item, ...cur.filter((c) => c.key !== item.key)]);
    setPicked(item, true);
  };

  const reset = () => {
    setAnswers({});
    setPantry([]);
    setAdded([]);
    setPhase("door");
  };

  return (
    <MotionConfig reducedMotion="user">
      <Kitchen>
        <div className="relative mx-auto flex h-dvh w-full max-w-[440px] flex-col items-center px-4 pt-6 pb-3">
          <Header phase={phase} doorDone={doorDone} />

          <Fridge
            phase={phase}
            canOpen={doorDone}
            onOpen={() => setPhase("inside")}
            door={
              phase === "door" ? (
                <DoorNotes questions={questions} answers={answers} onAnswer={answer} />
              ) : (
                <CookingTransition active={phase === "cooking" || phase === "result"} />
              )
            }
            interior={
              phase !== "door" && (
                <FridgeShelves
                  items={stock}
                  pickedKeys={pickedKeys}
                  boardRef={boardRef}
                  onDrop={(item) => setPicked(item, true)}
                  onToggle={(item) => setPicked(item)}
                  search={<PantrySearch ingredients={ingredients} onAdd={addFromSearch} />}
                />
              )
            }
          />

          <AnimatePresence>
            {phase === "inside" && (
              <CuttingBoard
                ref={boardRef}
                items={picked}
                onRemove={(item) => setPicked(item, false)}
                onCook={() => setPhase("cooking")}
              />
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {phase === "result" && results.length > 0 && <RecipeCard results={results} counts={counts} onRetry={reset} />}
        </AnimatePresence>
      </Kitchen>
    </MotionConfig>
  );
}

function Header({ phase, doorDone }: { phase: Phase; doorDone: boolean }) {
  const line =
    phase === "door"
      ? doorDone
        ? "準備OK。取っ手をひっぱって、開けてみよう"
        : "冷蔵庫のメモに、こたえてね"
      : phase === "inside"
        ? "棚は横にスワイプ。使うものは下へ"
        : phase === "cooking"
          ? "いいにおいがしてきた…"
          : "できたよ";

  return (
    <div className="mb-3 flex w-full items-end justify-between gap-3">
      <h1 className="font-hand shrink-0 whitespace-nowrap text-[1.15rem] leading-none text-ink -rotate-2">
        きょうの
        <span className="relative mx-0.5 inline-block">
          すき
          <svg className="absolute -bottom-1.5 left-0 w-full" viewBox="0 0 40 6" aria-hidden>
            <path d="M1 4 Q 10 1 20 3.5 T 39 2.5" stroke="var(--tomato)" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </span>
        は冷蔵庫に
      </h1>
      <AnimatePresence mode="wait">
        <motion.p
          key={line}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="text-right text-[0.68rem] leading-snug text-ink/70"
          aria-live="polite"
        >
          {line}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
