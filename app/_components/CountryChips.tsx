import { countriesFromTags } from "@/lib/countries";
import { jitter } from "@/lib/jitter";
import type { TagWeights } from "@/lib/types";
import { Flag } from "./Flag";

/** レシピのタグ（country_xx）から、国旗つきの小さなスタンプを並べる。国が無ければ何も出さない */
export function CountryChips({ tags, className = "" }: { tags: TagWeights; className?: string }) {
  const countries = countriesFromTags(tags);
  if (countries.length === 0) return null;
  return (
    <span className={`flex flex-wrap gap-1.5 ${className}`}>
      {countries.map((c) => (
        <span
          key={c.code}
          className="inline-flex items-center gap-1 rounded-full border border-current px-1.5 py-px text-[0.65rem] text-[#a0392b]"
          style={{ rotate: `${jitter(c.code + "chip", -4, 4)}deg` }}
        >
          <Flag code={c.code} className="text-[0.8rem]" />
          {c.name}
        </span>
      ))}
    </span>
  );
}
