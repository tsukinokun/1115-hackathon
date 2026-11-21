import { flagOf } from "@/lib/countries";

/** 国旗。Windows でも絵になるよう Noto Color Emoji で描く */
export function Flag({ code, className = "" }: { code: string; className?: string }) {
  return (
    <span className={`font-flag leading-none ${className}`} aria-hidden>
      {flagOf(code)}
    </span>
  );
}
