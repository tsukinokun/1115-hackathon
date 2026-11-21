/**
 * 文字列シードから決まった「ゆらぎ」を返す。
 * Math.random() を使わないのでサーバーとクライアントで値がズレない（hydration 安全）。
 */
export function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 仕上げに全ビットをかき混ぜる（"sample-1" と "sample-2" のように末尾だけ違う文字列でも散らばるように）
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

export function jitter(seed: string, min: number, max: number) {
  return min + hash(seed) * (max - min);
}

export function pick<T>(seed: string, list: readonly T[]): T {
  return list[Math.floor(hash(seed) * list.length) % list.length];
}
